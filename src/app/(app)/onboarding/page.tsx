import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If already enrolled, skip onboarding
  const { data: enrollment } = await supabase
    .from('user_exam_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (enrollment) redirect('/syllabus')

  // Load available exam templates
  const { data: templates } = await supabase
    .from('exam_templates')
    .select('id, name, slug')

  return (
    <OnboardingWizard
      templates={(templates ?? []) as { id: string; name: string; slug: string }[]}
      userId={user.id}
    />
  )
}
