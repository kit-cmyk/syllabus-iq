import Link from 'next/link'
import type { LeakEntry } from '@/types/exam'

export default function LeakDetector({ leaks }: { leaks: LeakEntry[] }) {
  if (!leaks.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No major leaks detected. Keep it up!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {leaks.map((leak, i) => (
        <Link
          key={leak.node_path}
          href={`/log?node=${encodeURIComponent(leak.node_path)}&label=${encodeURIComponent(leak.label)}`}
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 p-3 transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 font-bold text-sm flex-shrink-0">
            #{i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground group-hover:text-brand-sky transition-colors truncate">
              {leak.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {leak.subject_code} · {leak.mastery_score}% mastery · dragging avg by {Math.round(leak.drag)}pts
            </div>
          </div>
          <div className="text-xs text-red-400 font-semibold flex-shrink-0">Log →</div>
        </Link>
      ))}
    </div>
  )
}
