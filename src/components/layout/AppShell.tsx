'use client'

import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useUserStore } from '@/store/user-store'
import { useEnrollmentStore } from '@/store/enrollment-store'
import { setupOnlineListener } from '@/lib/sync/sync-queue'
import { registerServiceWorker } from '@/lib/pwa/register-sw'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

interface UserData {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  total_xp: number
  streak_count: number
  streak_shields: number
}

interface EnrollmentData {
  id: string
  template_id: string
  exam_date: string
  weekly_hours: number
  exam_templates: { slug: string } | null
}

interface Props {
  children: React.ReactNode
  user: UserData
  enrollment: EnrollmentData | null
}

export default function AppShell({ children, user, enrollment }: Props) {
  const setUser = useUserStore((s) => s.setUser)
  const setEnrollment = useEnrollmentStore((s) => s.setEnrollment)

  useEffect(() => {
    setUser(user)
    if (enrollment) {
      setEnrollment({
        enrollmentId: enrollment.id,
        templateId: enrollment.template_id,
        examDate: enrollment.exam_date,
        weeklyHours: enrollment.weekly_hours,
        templateSlug: enrollment.exam_templates?.slug ?? '',
      })
    }
    setupOnlineListener()
    registerServiceWorker()
  }, [user, enrollment, setUser, setEnrollment])

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  )
}
