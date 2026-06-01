'use client'

import { useEnrollmentStore } from '@/store/enrollment-store'
import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { Wifi, WifiOff } from 'lucide-react'

export default function TopBar() {
  const examDate = useEnrollmentStore((s) => s.examDate)
  const [isOnline, setIsOnline] = useState(true)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (!examDate) return
    const days = differenceInDays(parseISO(examDate), new Date())
    setDaysLeft(Math.max(0, days))
  }, [examDate])

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      {/* Exam countdown */}
      {daysLeft !== null && (
        <div className="flex items-center gap-2">
          <div className={`text-sm font-semibold ${daysLeft <= 30 ? 'text-red-400' : 'text-brand-sky'}`}>
            📅 {daysLeft} days to exam
          </div>
          {daysLeft <= 30 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Final stretch
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 ml-auto">
        {/* Online/offline indicator */}
        <div className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-amber-400'}`}>
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span>{isOnline ? 'Online' : 'Offline — changes will sync'}</span>
        </div>
      </div>
    </header>
  )
}
