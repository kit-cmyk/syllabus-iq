import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SyllabusTree from '@/components/syllabus/SyllabusTree'
import type { ExamTemplate, UserNodeState } from '@/types/exam'

export default async function SyllabusPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get active enrollment
  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id, template_id, exam_templates(config, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!enrollment) redirect('/onboarding')

  const template = (enrollment.exam_templates as unknown as { config: ExamTemplate; slug: string } | null)?.config
  if (!template) redirect('/onboarding')

  // Load user node states for this enrollment
  const { data: nodeStates } = await supabase
    .from('user_nodes')
    .select('node_path, coverage_status, mastery_score, updated_at')
    .eq('user_id', user.id)
    .eq('enrollment_id', enrollment.id)

  const typedTemplate: ExamTemplate = { ...template, id: enrollment.template_id }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Syllabus</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click a coverage badge to cycle status · hover a topic to log a session
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">
            {(nodeStates ?? []).filter((n) => n.coverage_status === 'completed').length} /
            {typedTemplate.subjects.flatMap((s) => s.domains.flatMap((d) => d.topics)).length} topics
          </div>
          <div>completed</div>
        </div>
      </div>

      <SyllabusTree
        template={typedTemplate}
        nodeStates={(nodeStates ?? []) as UserNodeState[]}
        enrollmentId={enrollment.id}
        userId={user.id}
      />
    </div>
  )
}
