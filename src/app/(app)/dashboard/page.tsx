import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computePassingStatus } from '@/lib/mastery/passing-status'
import StatusBanner from '@/components/dashboard/StatusBanner'
import SubjectCard from '@/components/dashboard/SubjectCard'
import LeakDetector from '@/components/dashboard/LeakDetector'
import MasteryRadar from '@/components/dashboard/MasteryRadar'
import type { ExamTemplate, UserNodeState } from '@/types/exam'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id, template_id, exam_templates(config)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!enrollment) redirect('/onboarding')

  const template = (enrollment.exam_templates as unknown as { config: ExamTemplate } | null)?.config
  if (!template) redirect('/onboarding')

  const { data: nodeStates } = await supabase
    .from('user_nodes')
    .select('node_path, coverage_status, mastery_score, updated_at')
    .eq('user_id', user.id)
    .eq('enrollment_id', enrollment.id)

  const typedTemplate: ExamTemplate = { ...template, id: enrollment.template_id }
  const status = computePassingStatus(typedTemplate, (nodeStates ?? []) as UserNodeState[])

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your estimated board exam readiness</p>
      </div>

      {/* Status banner */}
      <StatusBanner overallScore={status.overall_score} status={status.status} />

      {/* Radar + Subject cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Subject Mastery Radar
          </h2>
          <MasteryRadar subjects={status.subjects} />
        </div>

        {/* Subject cards */}
        <div className="space-y-3">
          {status.subjects.map((subject) => (
            <SubjectCard key={subject.subject_id} subject={subject} />
          ))}
        </div>
      </div>

      {/* Leak Detector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            🔍 Leak Detector
          </h2>
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            Top 3 weak spots
          </span>
        </div>
        <LeakDetector leaks={status.top_leaks} />
      </div>
    </div>
  )
}
