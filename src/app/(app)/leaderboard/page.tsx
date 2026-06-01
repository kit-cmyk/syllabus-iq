import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get leaderboard data (only opted-in users)
  const { data: rankings } = await supabase
    .from('leaderboard')
    .select('enrollment_id, template_id, avg_mastery, topics_logged, rank')
    .order('rank', { ascending: true })
    .limit(20)

  // Get current user enrollment
  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('opt_in_leaderboard')
    .eq('id', user.id)
    .single()

  const userRank = rankings?.find((r) => r.enrollment_id === enrollment?.id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Anonymous rankings of opted-in reviewers</p>
      </div>

      {/* Opt-in notice */}
      {!profile?.opt_in_leaderboard && (
        <div className="rounded-xl border border-brand-sky/30 bg-brand-sky/5 p-4">
          <div className="font-semibold text-brand-sky text-sm mb-1">Join the leaderboard</div>
          <p className="text-xs text-muted-foreground">
            You&apos;re currently anonymous. Enable leaderboard in Settings to see your rank and compare with other reviewers.
          </p>
        </div>
      )}

      {/* User rank card */}
      {userRank && (
        <div className="rounded-xl border border-brand-sky/50 bg-brand-sky/10 p-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black text-brand-sky">#{userRank.rank}</div>
            <div>
              <div className="font-semibold text-foreground">Your Rank</div>
              <div className="text-sm text-muted-foreground">
                {userRank.avg_mastery}% avg mastery · {userRank.topics_logged} topics logged
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings table */}
      <div className="space-y-2">
        {(rankings ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No rankings yet. Be the first to opt in!</p>
          </div>
        ) : (
          (rankings ?? []).map((entry) => {
            const isUser = entry.enrollment_id === enrollment?.id
            return (
              <div
                key={entry.enrollment_id}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                  isUser ? 'border-brand-sky/50 bg-brand-sky/10' : 'border-border bg-card'
                }`}
              >
                <div className={`w-8 text-center font-bold ${
                  entry.rank === 1 ? 'text-yellow-400 text-lg' :
                  entry.rank === 2 ? 'text-gray-300 text-lg' :
                  entry.rank === 3 ? 'text-amber-600 text-lg' : 'text-muted-foreground text-sm'
                }`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {isUser ? 'You' : `Reviewer #${entry.rank * 7 + 13}`}
                  </div>
                  <div className="text-xs text-muted-foreground">{entry.topics_logged} topics logged</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-sky">{entry.avg_mastery}%</div>
                  <div className="text-[10px] text-muted-foreground">avg mastery</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
