'use client'

import { Progress } from '@/components/ui/progress'
import type { SubjectMastery } from '@/types/exam'
import Link from 'next/link'

const STATUS_CONFIG = {
  passing: { label: 'Passing', className: 'bg-brand-sky/20 text-brand-sky border-brand-sky/30' },
  developing: { label: 'Developing', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  at_risk: { label: 'At Risk ⚠', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function SubjectCard({ subject }: { subject: SubjectMastery }) {
  const { label: statusLabel, className: statusClass } = STATUS_CONFIG[subject.status]
  const progressColor =
    subject.status === 'passing'
      ? '[&>div]:bg-brand-sky'
      : subject.status === 'developing'
      ? '[&>div]:bg-amber-400'
      : '[&>div]:bg-red-400'

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 ${
      subject.status === 'at_risk' ? 'border-red-500/30' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
            {subject.subject_code}
          </div>
          <div className="text-sm font-semibold text-foreground leading-tight">{subject.subject_label}</div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Mastery</span>
          <span className="font-bold text-foreground">{subject.mastery_score}%</span>
        </div>
        <Progress value={subject.mastery_score} className={`h-2 bg-white/10 ${progressColor}`} />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{subject.completed_count}/{subject.topic_count} topics covered</span>
        <Link
          href={`/syllabus?subject=${subject.subject_id}`}
          className="text-brand-sky hover:underline"
        >
          View →
        </Link>
      </div>
    </div>
  )
}
