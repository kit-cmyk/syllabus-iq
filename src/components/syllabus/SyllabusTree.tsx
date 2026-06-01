'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, BookOpen, Search, PenLine } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MasteryRing from './MasteryRing'
import CoverageChip from './CoverageChip'
import type { ExamTemplate, ExamSubject, ExamDomain, ExamTopic, UserNodeState, CoverageStatus } from '@/types/exam'
import { createClient } from '@/lib/supabase/client'
import { getDb } from '@/lib/dexie/db'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  template: ExamTemplate
  nodeStates: UserNodeState[]
  enrollmentId: string
  userId: string
}

export default function SyllabusTree({ template, nodeStates: initialStates, enrollmentId, userId }: Props) {
  const router = useRouter()
  const [nodeMap, setNodeMap] = useState<Map<string, UserNodeState>>(
    () => new Map(initialStates.map((n) => [n.node_path, n]))
  )
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(() => new Set([template.subjects[0]?.id]))
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [updatingPath, setUpdatingPath] = useState<string | null>(null)

  const searchLower = search.toLowerCase()

  const matchesTopic = useCallback(
    (topic: ExamTopic) => !search || topic.label.toLowerCase().includes(searchLower),
    [search, searchLower]
  )

  const matchesDomain = useCallback(
    (domain: ExamDomain) =>
      !search ||
      domain.label.toLowerCase().includes(searchLower) ||
      domain.topics.some(matchesTopic),
    [search, searchLower, matchesTopic]
  )

  const visibleSubjects = useMemo(
    () =>
      template.subjects.filter(
        (s) =>
          !search ||
          s.label.toLowerCase().includes(searchLower) ||
          s.domains.some(matchesDomain)
      ),
    [template.subjects, search, searchLower, matchesDomain]
  )

  const getNode = (path: string): UserNodeState => nodeMap.get(path) ?? {
    node_path: path,
    coverage_status: 'unread',
    mastery_score: 0,
    updated_at: new Date().toISOString(),
  }

  const subjectMastery = (subject: ExamSubject): number => {
    const topics = subject.domains.flatMap((d) => d.topics)
    if (!topics.length) return 0
    return topics.reduce((sum, t) => sum + getNode(t.id).mastery_score, 0) / topics.length
  }

  async function cycleCoverage(path: string) {
    setUpdatingPath(path)
    const current = getNode(path).coverage_status
    const next: CoverageStatus =
      current === 'unread' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'unread'
    const now = new Date().toISOString()

    // Optimistic update
    setNodeMap((prev) => {
      const updated = new Map(prev)
      updated.set(path, { ...getNode(path), coverage_status: next, updated_at: now })
      return updated
    })

    // Write to Dexie (offline-first)
    const db = getDb()
    const existing = await db.user_nodes
      .where(['user_id', 'enrollment_id', 'node_path'])
      .equals([userId, enrollmentId, path])
      .first()

    if (existing?.id) {
      await db.user_nodes.update(existing.id, { coverage_status: next, updated_at: now, synced: false })
    } else {
      await db.user_nodes.add({
        user_id: userId,
        enrollment_id: enrollmentId,
        node_path: path,
        coverage_status: next,
        mastery_score: getNode(path).mastery_score,
        updated_at: now,
        synced: false,
      })
    }

    // Async sync to Supabase
    const supabase = createClient()
    supabase.from('user_nodes').upsert(
      { user_id: userId, enrollment_id: enrollmentId, node_path: path, coverage_status: next, updated_at: now },
      { onConflict: 'user_id,enrollment_id,node_path' }
    ).then(({ error }) => {
      if (!error) db.user_nodes.where(['user_id', 'enrollment_id', 'node_path']).equals([userId, enrollmentId, path]).modify({ synced: true })
    })

    if (next === 'completed') toast.success('Topic completed! +10 XP 🎯')
    setUpdatingPath(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleSubjects.map((subject) => {
          const isExpanded = expandedSubjects.has(subject.id) || !!search
          const sMastery = subjectMastery(subject)

          return (
            <div key={subject.id} className="rounded-xl border border-border overflow-hidden">
              {/* Subject header */}
              <button
                onClick={() =>
                  setExpandedSubjects((prev) => {
                    const next = new Set(prev)
                    next.has(subject.id) ? next.delete(subject.id) : next.add(subject.id)
                    return next
                  })
                }
                className="flex w-full items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <BookOpen className="h-4 w-4 text-brand-sky flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-foreground">{subject.label}</span>
                <span className="text-xs font-mono text-muted-foreground mr-2">{subject.code}</span>
                <MasteryRing score={Math.round(sMastery)} />
              </button>

              {/* Domains */}
              {isExpanded && (
                <div className="border-t border-border/50">
                  {subject.domains
                    .filter((d) => !search || matchesDomain(d))
                    .map((domain) => {
                      const isDomainExpanded = expandedDomains.has(domain.id) || !!search
                      const visibleTopics = domain.topics.filter(matchesTopic)

                      return (
                        <div key={domain.id} className="border-b border-border/30 last:border-b-0">
                          <button
                            onClick={() =>
                              setExpandedDomains((prev) => {
                                const next = new Set(prev)
                                next.has(domain.id) ? next.delete(domain.id) : next.add(domain.id)
                                return next
                              })
                            }
                            className="flex w-full items-center gap-3 px-6 py-2.5 bg-background hover:bg-muted/30 transition-colors text-left"
                          >
                            {isDomainExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="flex-1 text-xs font-medium text-muted-foreground">{domain.label}</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {domain.topics.filter((t) => getNode(t.id).coverage_status === 'completed').length}/{domain.topics.length} done
                            </span>
                          </button>

                          {/* Topics */}
                          {isDomainExpanded && (
                            <div className="bg-background/50">
                              {visibleTopics.map((topic) => {
                                const node = getNode(topic.id)
                                const isUpdating = updatingPath === topic.id
                                return (
                                  <div
                                    key={topic.id}
                                    className="flex items-center gap-3 px-8 py-2.5 hover:bg-muted/20 transition-colors group"
                                  >
                                    <span className="flex-1 text-sm text-foreground/90">{topic.label}</span>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Link
                                        href={`/log?node=${encodeURIComponent(topic.id)}&label=${encodeURIComponent(topic.label)}`}
                                        className="flex items-center gap-1 rounded-md bg-brand-sky/10 px-2 py-1 text-[10px] font-medium text-brand-sky hover:bg-brand-sky/20 transition-colors"
                                      >
                                        <PenLine className="h-3 w-3" /> Log
                                      </Link>
                                    </div>

                                    <button
                                      onClick={() => cycleCoverage(topic.id)}
                                      disabled={isUpdating}
                                      className="flex-shrink-0"
                                    >
                                      <CoverageChip status={node.coverage_status} />
                                    </button>

                                    <MasteryRing score={node.mastery_score} size={32} />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}

        {visibleSubjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-30" />
            <p>No topics match &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  )
}
