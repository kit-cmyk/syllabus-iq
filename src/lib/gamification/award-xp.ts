'use server'

import { createClient } from '@/lib/supabase/server'
import { XP_REWARDS, type XpActionType } from '@/types/gamification'

export async function awardXp(userId: string, action: XpActionType): Promise<number> {
  const supabase = await createClient()
  const xp = XP_REWARDS[action]
  if (!xp) return 0

  // Log XP entry
  await supabase.from('user_xp_log').insert({ user_id: userId, action_type: action, xp_earned: xp })

  // Atomically increment profile XP via RPC
  await supabase.rpc('increment_profile_xp', { p_user_id: userId, p_amount: xp })

  return xp
}

export async function checkAndGrantAchievement(
  userId: string,
  slug: string
): Promise<boolean> {
  const supabase = await createClient()

  // Try to insert — unique constraint means it's a no-op if already unlocked
  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_slug: slug })

  return !error // true = newly unlocked
}
