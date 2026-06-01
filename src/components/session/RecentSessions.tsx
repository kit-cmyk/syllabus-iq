import { formatDistanceToNow } from 'date-fns'
import { Clock, Target } from 'lucide-react'

interface Session {
  id: string
  node_path: string
  type: 'passive' | 'quiz'
  duration_minutes: number | null
  score: number | null
  total_items: number | null
  logged_at: string
}

function getTopicLabel(path: string) {
  const parts = path.split('.')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

export default function RecentSessions({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No sessions yet. Log your first session above!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
            s.type === 'quiz' ? 'bg-brand-sky/20 text-brand-sky' : 'bg-purple-500/20 text-purple-300'
          }`}>
            {s.type === 'quiz' ? <Target className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate capitalize">
              {getTopicLabel(s.node_path)}
            </div>
            <div className="text-xs text-muted-foreground">
              {s.type === 'passive' && s.duration_minutes && `${s.duration_minutes} min read`}
              {s.type === 'quiz' && s.score !== null && s.total_items !== null &&
                `${s.score}/${s.total_items} (${Math.round((s.score / s.total_items) * 100)}%)`}
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right flex-shrink-0">
            {formatDistanceToNow(new Date(s.logged_at), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  )
}
