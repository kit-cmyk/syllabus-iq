'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useEnrollmentStore } from '@/store/enrollment-store'
import { useUserStore } from '@/store/user-store'
import { getDb } from '@/lib/dexie/db'
import { computeEwma, scoreToPercent } from '@/lib/mastery/ewma'
import { getXpProgress } from '@/types/gamification'
import confetti from 'canvas-confetti'

interface Props {
  topicOptions: { id: string; label: string; subjectCode: string }[]
  userId: string
}

export default function SessionForm({ topicOptions, userId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const enrollmentId = useEnrollmentStore((s) => s.enrollmentId)
  const addXp = useUserStore((s) => s.addXp)
  const user = useUserStore((s) => s.user)

  const [sessionType, setSessionType] = useState<'passive' | 'quiz'>('passive')
  const [selectedNode, setSelectedNode] = useState(searchParams.get('node') ?? '')
  const [nodeSearch, setNodeSearch] = useState(searchParams.get('label') ?? '')
  const [showNodeDropdown, setShowNodeDropdown] = useState(false)
  const [duration, setDuration] = useState('30')
  const [score, setScore] = useState('')
  const [totalItems, setTotalItems] = useState('25')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const nodeId = searchParams.get('node')
    const label = searchParams.get('label')
    if (nodeId) setSelectedNode(nodeId)
    if (label) setNodeSearch(label)
  }, [searchParams])

  const filteredTopics = topicOptions.filter(
    (t) =>
      t.label.toLowerCase().includes(nodeSearch.toLowerCase()) ||
      t.subjectCode.toLowerCase().includes(nodeSearch.toLowerCase())
  )

  const scorePercent =
    sessionType === 'quiz' && score && totalItems
      ? Math.round((parseFloat(score) / parseFloat(totalItems)) * 100)
      : null

  async function handleSubmit() {
    if (!selectedNode || !enrollmentId) {
      toast.error('Please select a topic')
      return
    }
    if (sessionType === 'passive' && !duration) {
      toast.error('Please enter study duration')
      return
    }

    setSubmitting(true)

    const payload = {
      enrollment_id: enrollmentId,
      node_path: selectedNode,
      type: sessionType,
      ...(sessionType === 'passive' && { duration_minutes: parseInt(duration) }),
      ...(sessionType === 'quiz' && {
        score: parseFloat(score),
        total_items: parseFloat(totalItems),
      }),
    }

    // Offline-first: write to Dexie immediately
    const db = getDb()
    await db.sessions.add({
      user_id: userId,
      enrollment_id: enrollmentId,
      node_path: selectedNode,
      type: sessionType,
      duration_minutes: sessionType === 'passive' ? parseInt(duration) : undefined,
      score: sessionType === 'quiz' ? parseFloat(score) : undefined,
      total_items: sessionType === 'quiz' ? parseFloat(totalItems) : undefined,
      logged_at: new Date().toISOString(),
      synced: false,
    })

    // If quiz: update local mastery
    if (sessionType === 'quiz' && score && totalItems) {
      const existing = await db.user_nodes
        .where(['user_id', 'enrollment_id', 'node_path'])
        .equals([userId, enrollmentId, selectedNode])
        .first()
      const prevMastery = existing?.mastery_score ?? 0
      const newMastery = computeEwma(prevMastery, scoreToPercent(parseFloat(score), parseFloat(totalItems)))
      const now = new Date().toISOString()

      if (existing?.id) {
        await db.user_nodes.update(existing.id, { mastery_score: newMastery, updated_at: now, synced: false })
      } else {
        await db.user_nodes.add({
          user_id: userId,
          enrollment_id: enrollmentId,
          node_path: selectedNode,
          coverage_status: 'in_progress',
          mastery_score: newMastery,
          updated_at: now,
          synced: false,
        })
      }
    }

    // Try server sync
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        const prevXp = user?.total_xp ?? 0
        const prevLevel = getXpProgress(prevXp).level
        addXp(data.xp_awarded)
        const newLevel = getXpProgress(prevXp + data.xp_awarded).level

        if (newLevel.level > prevLevel.level) {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
          toast.success(`Level up! You're now ${newLevel.label} 🎉`, { duration: 5000 })
        } else {
          toast.success(`Session logged! +${data.xp_awarded} XP ⚡`)
        }

        if (scorePercent !== null && scorePercent >= 80) {
          toast.success('High score bonus! +10 XP 🔥', { duration: 3000 })
        }
      } else {
        toast.info('Session saved offline — will sync when online')
      }
    } catch {
      toast.info('Session saved offline — will sync when online')
    }

    // Reset form
    setScore('')
    setDuration('30')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Session type */}
      <div className="space-y-2">
        <Label>Session Type</Label>
        <Tabs value={sessionType} onValueChange={(v) => setSessionType(v as 'passive' | 'quiz')}>
          <TabsList className="w-full grid grid-cols-2 bg-card">
            <TabsTrigger value="passive" className="data-[state=active]:bg-brand-persian data-[state=active]:text-white">
              📖 Passive Review
            </TabsTrigger>
            <TabsTrigger value="quiz" className="data-[state=active]:bg-brand-persian data-[state=active]:text-white">
              🎯 Active Quiz
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {sessionType === 'passive'
            ? 'Reading, watching videos, making notes — time spent'
            : 'Enter your quiz score to update mastery via EWMA'}
        </p>
      </div>

      {/* Topic picker */}
      <div className="space-y-2 relative">
        <Label>Topic</Label>
        <Input
          placeholder="Search topics..."
          value={nodeSearch}
          onChange={(e) => { setNodeSearch(e.target.value); setShowNodeDropdown(true) }}
          onFocus={() => setShowNodeDropdown(true)}
          className="bg-card"
        />
        {showNodeDropdown && filteredTopics.length > 0 && (
          <div className="absolute z-50 w-full rounded-xl border border-border bg-popover shadow-xl max-h-56 overflow-y-auto">
            {filteredTopics.slice(0, 20).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedNode(t.id)
                  setNodeSearch(t.label)
                  setShowNodeDropdown(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 text-left"
              >
                <span className="rounded bg-brand-sky/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-sky">
                  {t.subjectCode}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {selectedNode && (
          <div className="text-[11px] text-brand-sky font-mono">{selectedNode}</div>
        )}
      </div>

      {/* Passive: duration */}
      {sessionType === 'passive' && (
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-card text-center text-xl font-bold w-28"
            />
            <span className="text-muted-foreground text-sm">minutes</span>
          </div>
          <div className="flex gap-2">
            {['15', '30', '45', '60', '90'].map((m) => (
              <button
                key={m}
                onClick={() => setDuration(m)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                  duration === m
                    ? 'border-brand-sky bg-brand-sky/10 text-brand-sky'
                    : 'border-border text-muted-foreground hover:border-brand-ocean/50'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            +{Math.floor(parseInt(duration || '0') / 30) * 5} XP for this session
          </p>
        </div>
      )}

      {/* Quiz: score */}
      {sessionType === 'quiz' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Score</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 18"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="bg-card text-center text-2xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Items</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 25"
                value={totalItems}
                onChange={(e) => setTotalItems(e.target.value)}
                className="bg-card text-center text-2xl font-bold"
              />
            </div>
          </div>

          {scorePercent !== null && (
            <div className={`rounded-xl p-4 text-center text-2xl font-black ${
              scorePercent >= 75 ? 'bg-brand-sky/10 text-brand-sky' : 'bg-amber-500/10 text-amber-300'
            }`}>
              {scorePercent}%
              {scorePercent >= 80 && <span className="ml-2 text-sm">🔥 High Score!</span>}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting || !selectedNode}
        className="w-full bg-brand-persian hover:bg-brand-ocean py-6 text-base font-semibold"
        size="lg"
      >
        {submitting ? 'Logging...' : 'Log Session ⚡'}
      </Button>
    </div>
  )
}
