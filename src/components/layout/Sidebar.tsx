'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  BarChart3,
  Calendar,
  PenLine,
  Upload,
  Trophy,
  Settings,
  User,
  LogOut,
  Flame,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/user-store'
import { getXpProgress } from '@/types/gamification'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV_ITEMS = [
  { href: '/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/log', label: 'Log Session', icon: PenLine },
  { href: '/import', label: 'AI Import', icon: Upload },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUserStore((s) => s.user)
  const totalXp = user?.total_xp ?? 0
  const { level, progress } = getXpProgress(totalXp)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-brand-imperial text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sky flex-shrink-0">
          <span className="text-lg font-black text-brand-imperial">S</span>
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">SyllabusIQ</div>
          <div className="text-[10px] text-blue-300/70 uppercase tracking-widest">Board Exam Tracker</div>
        </div>
      </div>

      {/* User profile + XP */}
      {user && (
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 ring-2 ring-brand-sky/50">
              <AvatarImage src={user.avatar_url ?? ''} />
              <AvatarFallback className="bg-brand-persian text-xs">
                {user.display_name?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-tight">
                {user.display_name ?? user.email}
              </div>
              <div className="text-[11px] text-brand-sky font-semibold">{level.label}</div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-blue-300/70">
              <span>{totalXp} XP</span>
              <span>Lvl {level.level}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/10 [&>div]:bg-brand-sky" />
          </div>

          {/* Streak */}
          {user.streak_count > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-orange-300">
              <Flame className="h-3.5 w-3.5" />
              <span>{user.streak_count} day streak</span>
              {user.streak_shields > 0 && (
                <span className="ml-1 text-blue-300/70">🛡 ×{user.streak_shields}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-sky/20 text-brand-sky'
                  : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {href === '/log' && (
                <span className="ml-auto rounded-full bg-brand-sky/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-sky">
                  +XP
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-100/70 hover:bg-white/5 hover:text-white transition-all"
        >
          <User className="h-4 w-4" />
          Profile & Badges
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-100/70 hover:bg-white/5 hover:text-white transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-100/70 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
