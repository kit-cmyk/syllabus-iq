import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST(request: Request) {
  // Initialize VAPID inside the handler so build-time env stub doesn't throw
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@syllabusiq.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  )

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, url, user_id } = await request.json()
  const targetUserId = user_id ?? user.id

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetUserId)

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const payload = JSON.stringify({ title, body, url: url ?? '/syllabus' })
  let sent = 0

  for (const sub of subscriptions as { endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err) {
      const e = err as { statusCode?: number }
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return NextResponse.json({ sent })
}
