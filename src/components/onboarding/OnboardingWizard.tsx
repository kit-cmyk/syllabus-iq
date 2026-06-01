'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useEnrollmentStore } from '@/store/enrollment-store'
import type { ExamTemplate } from '@/types/exam'

interface Props {
  templates: Pick<ExamTemplate, 'id' | 'name' | 'slug'>[]
  userId: string
}

export default function OnboardingWizard({ templates, userId }: Props) {
  const router = useRouter()
  const setEnrollment = useEnrollmentStore((s) => s.setEnrollment)

  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[0] | null>(null)
  const [examDate, setExamDate] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!selectedTemplate || !examDate) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from('user_exam_enrollments')
      .insert({
        user_id: userId,
        template_id: selectedTemplate.id,
        exam_date: examDate,
        weekly_hours: parseFloat(weeklyHours) || 20,
      })
      .select('id')
      .single()

    if (dbError || !data) {
      setError('Failed to save enrollment. Please try again.')
      setLoading(false)
      return
    }

    setEnrollment({
      enrollmentId: data.id,
      templateId: selectedTemplate.id,
      examDate,
      weeklyHours: parseFloat(weeklyHours) || 20,
      templateSlug: selectedTemplate.slug,
    })

    router.push('/syllabus')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-all ${
                s <= step ? 'bg-brand-sky' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">Which exam are you taking?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select the board exam you&apos;re currently reviewing for
              </p>
            </div>
            <div className="grid gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selectedTemplate?.id === t.id
                      ? 'border-brand-sky bg-brand-sky/10 text-foreground'
                      : 'border-border bg-card text-foreground hover:border-brand-ocean/50'
                  }`}
                >
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{t.slug}</div>
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-brand-persian hover:bg-brand-ocean"
              disabled={!selectedTemplate}
              onClick={() => setStep(2)}
            >
              Continue →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">When is your exam?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ll use this to build your study schedule
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Exam Date</Label>
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-card"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                className="flex-1 bg-brand-persian hover:bg-brand-ocean"
                disabled={!examDate}
                onClick={() => setStep(3)}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">How many hours can you study?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Set a realistic weekly target — you can change this later
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-hours">Weekly Study Hours</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="weekly-hours"
                  type="number"
                  min="1"
                  max="84"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                  className="bg-card text-center text-2xl font-bold"
                />
                <span className="text-muted-foreground">hrs / week</span>
              </div>
              <div className="mt-4 flex gap-2">
                {['10', '20', '30', '40'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setWeeklyHours(h)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                      weeklyHours === h
                        ? 'border-brand-sky bg-brand-sky/10 text-brand-sky'
                        : 'border-border text-muted-foreground hover:border-brand-ocean/50'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-brand-sky/20 bg-brand-sky/5 p-4 text-sm">
              <div className="font-medium text-brand-sky mb-2">Your Study Plan</div>
              <div className="text-foreground space-y-1">
                <div>📚 <strong>{selectedTemplate?.name}</strong></div>
                <div>📅 Exam: <strong>{examDate}</strong></div>
                <div>⏱ <strong>{weeklyHours} hours</strong> per week</div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button
                className="flex-1 bg-brand-persian hover:bg-brand-ocean"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Setting up...' : "Let's go! 🚀"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
