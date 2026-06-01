export type XpActionType =
  | 'topic_completed'
  | 'passive_session'
  | 'quiz_session'
  | 'quiz_high_score'
  | 'streak_7_day'
  | 'streak_shield_used'

export interface UserLevel {
  level: number
  label: string
  min_xp: number
  max_xp: number
}

export const LEVELS: UserLevel[] = [
  { level: 1, label: 'Rookie', min_xp: 0, max_xp: 499 },
  { level: 2, label: 'Scholar', min_xp: 500, max_xp: 1499 },
  { level: 3, label: 'Analyst', min_xp: 1500, max_xp: 3499 },
  { level: 4, label: 'Expert', min_xp: 3500, max_xp: 6999 },
  { level: 5, label: 'CPA Candidate', min_xp: 7000, max_xp: Infinity },
]

export const XP_REWARDS: Record<XpActionType, number> = {
  topic_completed: 10,
  passive_session: 5,       // per 30 min
  quiz_session: 15,
  quiz_high_score: 10,      // bonus if score >= 80%
  streak_7_day: 50,
  streak_shield_used: 0,
}

export interface Achievement {
  slug: string
  label: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { slug: 'first_quiz', label: 'First Quiz', description: 'Log your first Active Quiz session', icon: '🎯' },
  { slug: 'deep_dive', label: 'Deep Dive', description: 'Log 3+ hours in a single day', icon: '🏊' },
  { slug: 'subject_conqueror', label: 'Subject Conqueror', description: 'All topics in a subject reach ≥75% mastery', icon: '👑' },
  { slug: 'speed_runner', label: 'Speed Runner', description: 'Complete full syllabus coverage in under 60 days', icon: '⚡' },
  { slug: 'passing_zone', label: 'Passing Zone', description: 'Estimated board score crosses 75% for the first time', icon: '🏆' },
  { slug: 'streak_7', label: 'On Fire', description: 'Maintain a 7-day study streak', icon: '🔥' },
  { slug: 'streak_30', label: 'Unstoppable', description: 'Maintain a 30-day study streak', icon: '💎' },
]

export function getLevelFromXp(totalXp: number): UserLevel {
  return LEVELS.find((l) => totalXp >= l.min_xp && totalXp <= l.max_xp) ?? LEVELS[LEVELS.length - 1]
}

export function getXpProgress(totalXp: number): { level: UserLevel; progress: number } {
  const level = getLevelFromXp(totalXp)
  if (level.max_xp === Infinity) return { level, progress: 100 }
  const progress = ((totalXp - level.min_xp) / (level.max_xp - level.min_xp)) * 100
  return { level, progress: Math.min(100, progress) }
}
