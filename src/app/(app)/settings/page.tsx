'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Bell, BellOff, Trophy } from 'lucide-react'

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check push subscription
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub)
        })
      })
    }

    // Load leaderboard pref
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('opt_in_leaderboard').eq('id', user.id).single()
        .then(({ data }) => setLeaderboardOptIn(data?.opt_in_leaderboard ?? false))
    })
  }, [])

  async function togglePush() {
    setLoading(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push notifications not supported in this browser')
        return
      }

      const reg = await navigator.serviceWorker.ready

      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          setPushEnabled(false)
          toast.info('Push notifications disabled')
        }
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Permission denied for notifications')
          return
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        })

        setPushEnabled(true)
        toast.success('Push notifications enabled! 🔔')
      }
    } finally {
      setLoading(false)
    }
  }

  async function toggleLeaderboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newValue = !leaderboardOptIn
    await supabase.from('profiles').update({ opt_in_leaderboard: newValue }).eq('id', user.id)
    setLeaderboardOptIn(newValue)
    toast.success(newValue ? 'You\'re now on the leaderboard!' : 'Removed from leaderboard')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your notifications and preferences</p>
      </div>

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="font-semibold text-foreground">Notifications</h2>
        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {pushEnabled ? (
              <Bell className="h-5 w-5 text-brand-sky mt-0.5 flex-shrink-0" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div className="font-medium text-foreground">Push Notifications</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Daily study reminders, pace warnings, and streak milestones
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>📅 Daily reminder at your preferred time</div>
                <div>⚠️ Pace warning when a subject is neglected 7+ days</div>
                <div>🔥 Streak milestone celebrations</div>
              </div>
            </div>
          </div>
          <Button
            variant={pushEnabled ? 'outline' : 'default'}
            onClick={togglePush}
            disabled={loading}
            className={pushEnabled ? '' : 'bg-brand-persian hover:bg-brand-ocean'}
          >
            {loading ? '...' : pushEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="space-y-4">
        <h2 className="font-semibold text-foreground">Community</h2>
        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-foreground">Anonymous Leaderboard</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Show your estimated score on the anonymous leaderboard. Your name is never shown — only your rank.
              </div>
            </div>
          </div>
          <Button
            variant={leaderboardOptIn ? 'outline' : 'default'}
            onClick={toggleLeaderboard}
            className={leaderboardOptIn ? '' : 'bg-brand-persian hover:bg-brand-ocean'}
          >
            {leaderboardOptIn ? 'Opt Out' : 'Opt In'}
          </Button>
        </div>
      </section>

      {/* App info */}
      <section className="space-y-4">
        <h2 className="font-semibold text-foreground">About</h2>
        <Separator />
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>SyllabusIQ v1.0.0</div>
          <div>Adaptive board exam progress tracker for Philippine professionals</div>
          <div className="text-xs">Built with Next.js, Supabase, and the Claude API</div>
        </div>
      </section>
    </div>
  )
}
