import type { ExamTemplate, ExamSubject } from '@/types/exam'
import { differenceInWeeks, parseISO, startOfWeek, addWeeks } from 'date-fns'

export interface WeekSchedule {
  weekStart: string
  weekNumber: number
  subjects: SubjectWeek[]
  totalTargetHours: number
  totalLoggedHours: number
}

export interface SubjectWeek {
  subject_id: string
  subject_code: string
  subject_label: string
  targetHours: number
  loggedHours: number
  paceWarning: boolean
}

interface SessionLog {
  node_path: string
  type: string
  duration_minutes: number | null
  logged_at: string
}

function getSubjectWeight(subject: ExamSubject): number {
  return subject.weight ?? subject.domains.flatMap((d) => d.topics).length
}

export function computeSchedule(
  template: ExamTemplate,
  examDate: string,
  weeklyHours: number,
  sessions: SessionLog[]
): WeekSchedule[] {
  const now = new Date()
  const exam = parseISO(examDate)
  const weeksRemaining = Math.max(1, differenceInWeeks(exam, now))

  const totalWeight = template.subjects.reduce((sum, s) => sum + getSubjectWeight(s), 0)

  // Group sessions by subject and week
  const sessionsBySubjectWeek = new Map<string, number>()

  for (const session of sessions) {
    if (!session.duration_minutes) continue
    const subjectId = session.node_path.split('.')[0]
    const weekStart = startOfWeek(new Date(session.logged_at)).toISOString()
    const key = `${subjectId}::${weekStart}`
    sessionsBySubjectWeek.set(key, (sessionsBySubjectWeek.get(key) ?? 0) + (session.duration_minutes / 60))
  }

  // Detect 7-day pace warnings per subject
  const subjectLastSession = new Map<string, Date>()
  for (const session of sessions) {
    const subjectId = session.node_path.split('.')[0]
    const sessionDate = new Date(session.logged_at)
    const existing = subjectLastSession.get(subjectId)
    if (!existing || sessionDate > existing) subjectLastSession.set(subjectId, sessionDate)
  }

  const schedules: WeekSchedule[] = []

  for (let w = 0; w < Math.min(weeksRemaining, 16); w++) {
    const weekStart = startOfWeek(addWeeks(now, w))
    const weekKey = weekStart.toISOString()

    const subjectWeeks: SubjectWeek[] = template.subjects.map((subject) => {
      const weight = getSubjectWeight(subject)
      const targetHours = (weight / totalWeight) * weeklyHours
      const logged = sessionsBySubjectWeek.get(`${subject.id}::${weekKey}`) ?? 0

      const lastSession = subjectLastSession.get(subject.id)
      const daysSinceLastSession = lastSession
        ? (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity
      const paceWarning = daysSinceLastSession > 7

      return {
        subject_id: subject.id,
        subject_code: subject.code,
        subject_label: subject.label,
        targetHours: Math.round(targetHours * 10) / 10,
        loggedHours: Math.round(logged * 10) / 10,
        paceWarning,
      }
    })

    schedules.push({
      weekStart: weekStart.toISOString(),
      weekNumber: w + 1,
      subjects: subjectWeeks,
      totalTargetHours: weeklyHours,
      totalLoggedHours: Math.round(subjectWeeks.reduce((s, sw) => s + sw.loggedHours, 0) * 10) / 10,
    })
  }

  return schedules
}
