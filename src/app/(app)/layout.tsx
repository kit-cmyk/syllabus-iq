import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, total_xp, streak_count, streak_shields')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Load most recent enrollment
  const { data: rawEnrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id, template_id, exam_date, weekly_hours, exam_templates(slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Redirect to onboarding if no enrollment
  if (!rawEnrollment && !children) {
    redirect('/onboarding')
  }

  // Normalize the exam_templates join (Supabase returns array for joins on untyped client)
  let enrollment = null
  if (rawEnrollment) {
    const tmpl = rawEnrollment.exam_templates
    const templateSlug = Array.isArray(tmpl) ? (tmpl[0] as { slug: string } | undefined) : (tmpl as { slug: string } | null)
    enrollment = {
      id: rawEnrollment.id as string,
      template_id: rawEnrollment.template_id as string,
      exam_date: rawEnrollment.exam_date as string,
      weekly_hours: rawEnrollment.weekly_hours as number,
      exam_templates: templateSlug ?? null,
    }
  }

  return (
    <AppShell
      user={profile}
      enrollment={enrollment}
    >
      {children}
    </AppShell>
  )
}
