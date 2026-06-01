import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ACHIEVEMENTS, LEVELS, getLevelFromXp } from '@/types/gamification'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, total_xp, streak_count, streak_shields, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: unlocked } = await supabase
    .from('user_achievements')
    .select('achievement_slug, unlocked_at')
    .eq('user_id', user.id)

  const unlockedSlugs = new Set(unlocked?.map((a) => a.achievement_slug) ?? [])
  const level = getLevelFromXp(profile.total_xp)
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1)
  const xpToNext = nextLevel ? nextLevel.min_xp - profile.total_xp : 0
  const progressPct = nextLevel
    ? ((profile.total_xp - level.min_xp) / (nextLevel.min_xp - level.min_xp)) * 100
    : 100

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 ring-4 ring-brand-sky/30">
            <AvatarImage src={profile.avatar_url ?? ''} />
            <AvatarFallback className="bg-brand-persian text-2xl font-bold text-white">
              {profile.display_name?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name ?? 'Reviewer'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="rounded-full bg-brand-sky/20 px-3 py-1 text-sm font-semibold text-brand-sky">
                {level.label}
              </span>
              {profile.streak_count > 0 && (
                <span className="text-sm text-orange-300">🔥 {profile.streak_count} day streak</span>
              )}
              {profile.streak_shields > 0 && (
                <span className="text-sm text-blue-300">🛡 {profile.streak_shields} shields</span>
              )}
            </div>

            {/* XP progress */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{profile.total_xp} XP total</span>
                {nextLevel && <span>{xpToNext} XP to {nextLevel.label}</span>}
              </div>
              <Progress value={progressPct} className="h-2 bg-white/10 [&>div]:bg-brand-sky" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
          {[
            { label: 'Total XP', value: profile.total_xp.toLocaleString() },
            { label: 'Level', value: `${level.level} · ${level.label}` },
            { label: 'Streak', value: `${profile.streak_count} days` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-brand-sky">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Achievements ({unlockedSlugs.size}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedSlugs.has(achievement.slug)
            return (
              <div
                key={achievement.slug}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  isUnlocked
                    ? 'border-brand-sky/30 bg-brand-sky/5'
                    : 'border-border bg-card opacity-50 grayscale'
                }`}
              >
                <div className="text-3xl flex-shrink-0">{achievement.icon}</div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{achievement.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{achievement.description}</div>
                  {!isUnlocked && (
                    <div className="text-[10px] text-muted-foreground/50 mt-1">🔒 Locked</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Level roadmap */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Level Roadmap
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {LEVELS.map((l) => (
            <div
              key={l.level}
              className={`flex-shrink-0 rounded-xl border px-4 py-3 text-center min-w-[120px] ${
                l.level === level.level
                  ? 'border-brand-sky bg-brand-sky/10'
                  : l.level < level.level
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="text-lg font-bold">{l.level < level.level ? '✓' : l.level === level.level ? '→' : l.level}</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">{l.label}</div>
              <div className="text-[10px] text-muted-foreground">{l.min_xp.toLocaleString()} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
