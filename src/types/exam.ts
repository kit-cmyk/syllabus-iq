export type CoverageStatus = 'unread' | 'in_progress' | 'completed'
export type SessionType = 'passive' | 'quiz'

export interface ExamTopic {
  id: string
  label: string
  weight?: number
}

export interface ExamDomain {
  id: string
  label: string
  topics: ExamTopic[]
}

export interface ExamSubject {
  id: string
  label: string
  code: string
  weight?: number
  domains: ExamDomain[]
}

export interface ExamTemplate {
  id: string
  name: string
  slug: string
  subjects: ExamSubject[]
}

export interface UserNodeState {
  node_path: string
  coverage_status: CoverageStatus
  mastery_score: number
  updated_at: string
}

export interface SessionPayload {
  node_path: string
  type: SessionType
  duration_minutes?: number
  score?: number
  total_items?: number
}

export interface SubjectMastery {
  subject_id: string
  subject_label: string
  subject_code: string
  mastery_score: number
  topic_count: number
  completed_count: number
  status: 'passing' | 'developing' | 'at_risk'
}

export interface PassingStatus {
  overall_score: number
  status: 'PASSING' | 'CONDITIONAL' | 'FAILING'
  subjects: SubjectMastery[]
  top_leaks: LeakEntry[]
}

export interface LeakEntry {
  node_path: string
  label: string
  subject_code: string
  mastery_score: number
  drag: number
}
