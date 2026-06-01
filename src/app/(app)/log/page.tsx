import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SessionForm from '@/components/session/SessionForm'
import RecentSessions from '@/components/session/RecentSessions'
import type { ExamTemplate } from '@/types/exam'

export default async function LogPage() {
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
  const topicOptions = template
    ? template.subjects.flatMap((s) =>
        s.domains.flatMap((d) =>
          d.topics.map((t) => ({ id: t.id, label: t.label, subjectCode: s.code }))
        )
      )
    : []

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, node_path, type, duration_minutes, score, total_items, logged_at')
    .eq('user_id', user.id)
    .eq('enrollment_id', enrollment.id)
    .order('logged_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Log a Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every session earns XP and updates your mastery score
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Suspense>
          <SessionForm topicOptions={topicOptions} userId={user.id} />
        </Suspense>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Recent Sessions
        </h2>
        <RecentSessions sessions={(sessions ?? []) as Parameters<typeof RecentSessions>[0]['sessions']} />
      </div>
    </div>
  )
}
