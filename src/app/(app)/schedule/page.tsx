import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeSchedule } from '@/lib/mastery/scheduler'
import { format, parseISO } from 'date-fns'
import type { ExamTemplate } from '@/types/exam'
import { AlertTriangle } from 'lucide-react'

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id, exam_date, weekly_hours, template_id, exam_templates(config)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!enrollment) redirect('/onboarding')

  const template = (enrollment.exam_templates as unknown as { config: ExamTemplate } | null)?.config
  if (!template) redirect('/onboarding')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('node_path, type, duration_minutes, logged_at')
    .eq('user_id', user.id)
    .eq('enrollment_id', enrollment.id)
    .order('logged_at', { ascending: false })

  const typedTemplate: ExamTemplate = { ...template, id: enrollment.template_id }
  const schedule = computeSchedule(
    typedTemplate,
    enrollment.exam_date,
    enrollment.weekly_hours,
    (sessions ?? []) as Parameters<typeof computeSchedule>[3]
  )

  const hasPaceWarnings = schedule[0]?.subjects.some((s) => s.paceWarning)
  const thisWeek = schedule[0]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Study Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {enrollment.weekly_hours}h/week target · Exam: {format(parseISO(enrollment.exam_date), 'PPP')}
        </p>
      </div>

      {/* Pace warning banner */}
      {hasPaceWarnings && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Pace Warning</div>
            <div className="text-sm text-amber-300/80 mt-0.5">
              You haven&apos;t studied some subjects in over 7 days.
              Their hours have been redistributed to keep you on track.
            </div>
          </div>
        </div>
      )}

      {/* This week */}
      {thisWeek && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">This Week</h2>
            <div className="text-sm text-muted-foreground">
              {thisWeek.totalLoggedHours}h / {thisWeek.totalTargetHours}h logged
            </div>
          </div>

          <div className="space-y-3">
            {thisWeek.subjects.map((sw) => {
              const pct = Math.min(100, sw.targetHours > 0 ? (sw.loggedHours / sw.targetHours) * 100 : 0)
              return (
                <div key={sw.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {sw.paceWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                      <span className="text-xs text-muted-foreground font-mono mr-1">{sw.subject_code}</span>
                      {sw.subject_label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {sw.loggedHours}h / {sw.targetHours}h
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? 'bg-brand-sky' : pct >= 50 ? 'bg-brand-persian' : 'bg-white/30'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming weeks */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Upcoming Weeks
        </h2>
        <div className="space-y-3">
          {schedule.slice(1, 8).map((week) => (
            <div key={week.weekStart} className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">
                  Week {week.weekNumber} — {format(parseISO(week.weekStart), 'MMM d')}
                </span>
                <span className="text-xs text-muted-foreground">{week.totalTargetHours}h target</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {week.subjects.map((sw) => (
                  <div
                    key={sw.subject_id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  >
                    <span className="font-bold text-brand-sky">{sw.subject_code}</span>
                    <span className="text-muted-foreground">{sw.targetHours}h</span>
                    {sw.paceWarning && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
