import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { computeEwma, scoreToPercent } from '@/lib/mastery/ewma'

const SessionSchema = z.object({
  enrollment_id: z.string().uuid(),
  node_path: z.string().min(1),
  type: z.enum(['passive', 'quiz']),
  duration_minutes: z.number().int().positive().optional(),
  score: z.number().min(0).optional(),
  total_items: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = SessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { enrollment_id, node_path, type, duration_minutes, score, total_items } = parsed.data
  const now = new Date().toISOString()

  // Insert session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      enrollment_id,
      node_path,
      type,
      duration_minutes,
      score,
      total_items,
      logged_at: now,
    })
    .select('id')
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  let newMastery: number | null = null

  // If quiz: compute EWMA and update mastery
  if (type === 'quiz' && score !== undefined && total_items !== undefined) {
    const { data: existing } = await supabase
      .from('user_nodes')
      .select('mastery_score')
      .eq('user_id', user.id)
      .eq('enrollment_id', enrollment_id)
      .eq('node_path', node_path)
      .single()

    const prevMastery = existing?.mastery_score ?? 0
    const scorePercent = scoreToPercent(score, total_items)
    newMastery = computeEwma(prevMastery, scorePercent)

    await supabase.from('user_nodes').upsert(
      {
        user_id: user.id,
        enrollment_id,
        node_path,
        mastery_score: newMastery,
        updated_at: now,
      },
      { onConflict: 'user_id,enrollment_id,node_path' }
    )
  }

  // Award XP
  const xpActions: string[] = [type === 'quiz' ? 'quiz_session' : 'passive_session']
  if (type === 'quiz' && score !== undefined && total_items !== undefined) {
    const pct = (score / total_items) * 100
    if (pct >= 80) xpActions.push('quiz_high_score')
  }

  let totalXpAwarded = 0
  for (const action of xpActions) {
    const xp = { quiz_session: 15, passive_session: 5, quiz_high_score: 10 }[action] ?? 0
    if (xp > 0) {
      await supabase.from('user_xp_log').insert({ user_id: user.id, action_type: action, xp_earned: xp })
      totalXpAwarded += xp
    }
  }

  // Increment profile XP (using raw SQL via RPC)
  if (totalXpAwarded > 0) {
    await supabase.rpc('increment_profile_xp', { p_user_id: user.id, p_amount: totalXpAwarded })
  }

  // Check "first_quiz" achievement (ignore duplicate error via catch on the promise)
  if (type === 'quiz') {
    supabase
      .from('user_achievements')
      .insert({ user_id: user.id, achievement_slug: 'first_quiz' })
      .then(() => { /* no-op */ }, () => { /* ignore duplicate key error */ })
  }

  return NextResponse.json({
    session_id: session.id,
    new_mastery: newMastery,
    xp_awarded: totalXpAwarded,
  })
}
