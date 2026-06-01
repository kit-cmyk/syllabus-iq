import { create } from 'zustand'

interface EnrollmentState {
  enrollmentId: string | null
  templateId: string | null
  examDate: string | null
  weeklyHours: number
  templateSlug: string | null
  setEnrollment: (data: {
    enrollmentId: string
    templateId: string
    examDate: string
    weeklyHours: number
    templateSlug: string
  }) => void
  clearEnrollment: () => void
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  enrollmentId: null,
  templateId: null,
  examDate: null,
  weeklyHours: 20,
  templateSlug: null,
  setEnrollment: (data) => set(data),
  clearEnrollment: () =>
    set({ enrollmentId: null, templateId: null, examDate: null, weeklyHours: 20, templateSlug: null }),
}))
