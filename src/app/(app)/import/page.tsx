'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useEnrollmentStore } from '@/store/enrollment-store'
import { useUserStore } from '@/store/user-store'
import { createClient } from '@/lib/supabase/client'
import { computeEwma, scoreToPercent } from '@/lib/mastery/ewma'
import { getDb } from '@/lib/dexie/db'

interface ParsedItem {
  question: string
  answer: string
  topic_hint: string
  suggested_node: { id: string; label: string; subjectCode: string } | null
  confirmed_node?: string
}

export default function ImportPage() {
  const enrollmentId = useEnrollmentStore((s) => s.enrollmentId)
  const user = useUserStore((s) => s.user)
  const [rawText, setRawText] = useState('')
  const [items, setItems] = useState<ParsedItem[]>([])
  const [parsing, setParsing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [step, setStep] = useState<'input' | 'review' | 'done'>('input')

  async function handleParse() {
    if (!rawText.trim() || !enrollmentId) return
    setParsing(true)
    try {
      const res = await fetch('/api/parse-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText, enrollment_id: enrollmentId }),
      })
      if (!res.ok) throw new Error('Parse failed')
      const data = await res.json()
      setItems(data.items.map((item: ParsedItem) => ({
        ...item,
        confirmed_node: item.suggested_node?.id ?? '',
      })))
      setStep('review')
    } catch {
      toast.error('Failed to parse quiz. Please check your input.')
    } finally {
      setParsing(false)
    }
  }

  async function handleLogAll() {
    if (!enrollmentId || !user) return
    setLogging(true)

    const confirmed = items.filter((item) => item.confirmed_node)
    if (!confirmed.length) {
      toast.error('No topics confirmed. Please review the mapping first.')
      setLogging(false)
      return
    }

    const db = getDb()
    const supabase = createClient()
    const scorePerItem = 1
    const now = new Date().toISOString()

    // Group by node: count correct answers
    const nodeGroups = new Map<string, { correct: number; total: number }>()
    for (const item of confirmed) {
      const nodeId = item.confirmed_node!
      const existing = nodeGroups.get(nodeId) ?? { correct: 0, total: 0 }
      existing.total++
      existing.correct++ // All extracted answers are assumed correct
      nodeGroups.set(nodeId, existing)
    }

    for (const [nodePath, { correct, total }] of nodeGroups.entries()) {
      // Update mastery via EWMA
      const existing = await db.user_nodes
        .where(['user_id', 'enrollment_id', 'node_path'])
        .equals([user.id, enrollmentId, nodePath])
        .first()
      const prevMastery = existing?.mastery_score ?? 0
      const newMastery = computeEwma(prevMastery, scoreToPercent(correct, total))

      // Dexie write
      if (existing?.id) {
        await db.user_nodes.update(existing.id, { mastery_score: newMastery, updated_at: now, synced: false })
      } else {
        await db.user_nodes.add({
          user_id: user.id, enrollment_id: enrollmentId, node_path: nodePath,
          coverage_status: 'in_progress', mastery_score: newMastery, updated_at: now, synced: false,
        })
      }

      // Session log
      await db.sessions.add({
        user_id: user.id, enrollment_id: enrollmentId, node_path: nodePath,
        type: 'quiz', score: correct, total_items: total,
        logged_at: now, synced: false,
      })

      // Sync to Supabase
      supabase.from('user_nodes').upsert(
        { user_id: user.id, enrollment_id: enrollmentId, node_path: nodePath, mastery_score: newMastery, updated_at: now },
        { onConflict: 'user_id,enrollment_id,node_path' }
      ).then(() => {})
      supabase.from('sessions').insert({
        user_id: user.id, enrollment_id: enrollmentId, node_path: nodePath,
        type: 'quiz', score: correct, total_items: total, logged_at: now,
      }).then(() => {})
    }

    toast.success(`${nodeGroups.size} topic(s) updated! Sessions logged automatically.`)
    setStep('done')
    setLogging(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Question Bank Parser</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a practice quiz and AI will extract Q&A pairs and map them to your syllabus
        </p>
      </div>

      {step === 'input' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paste Quiz Text</Label>
            <Textarea
              placeholder="Paste your practice quiz here... e.g.:

1. What is the carrying amount of an asset under PFRS 16?
A. Historical cost
B. Cost less accumulated depreciation
C. Right-of-use asset net of accumulated depreciation ✓
D. Fair value"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="bg-card min-h-[280px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supports MCQ, T/F, and short answer formats. The AI will identify correct answers.
            </p>
          </div>
          <Button
            onClick={handleParse}
            disabled={parsing || !rawText.trim() || !enrollmentId}
            className="w-full bg-brand-persian hover:bg-brand-ocean py-6 text-base font-semibold"
          >
            {parsing ? '🤖 Parsing with AI...' : '🤖 Parse Quiz →'}
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Review Mapping ({items.length} items)</h2>
            <Button variant="outline" size="sm" onClick={() => setStep('input')}>← Edit Text</Button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="text-sm text-foreground font-medium line-clamp-2">{item.question}</div>
                <div className="text-xs text-brand-sky">✓ {item.answer}</div>

                {item.suggested_node ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Mapped to:</span>
                    <span className="rounded-full bg-brand-sky/10 px-2 py-0.5 text-brand-sky font-medium">
                      [{item.suggested_node.subjectCode}] {item.suggested_node.label}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400">⚠ No matching topic found — will be skipped</div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleLogAll}
            disabled={logging}
            className="w-full bg-brand-sky hover:bg-brand-ocean text-brand-imperial font-bold py-6 text-base"
          >
            {logging ? 'Logging sessions...' : `Log ${items.filter(i => i.suggested_node).length} Sessions ⚡`}
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-foreground">Sessions Logged!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your mastery scores have been updated. Check the Dashboard to see your progress.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setStep('input'); setRawText(''); setItems([]) }}>
              Parse Another Quiz
            </Button>
            <Button className="bg-brand-persian hover:bg-brand-ocean" onClick={() => window.location.href = '/dashboard'}>
              View Dashboard →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
