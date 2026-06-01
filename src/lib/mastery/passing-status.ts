import type { ExamTemplate, ExamSubject, UserNodeState, SubjectMastery, PassingStatus, LeakEntry } from '@/types/exam'

export function computePassingStatus(
  template: ExamTemplate,
  nodeStates: UserNodeState[]
): PassingStatus {
  const nodeMap = new Map(nodeStates.map((n) => [n.node_path, n]))

  const subjects: SubjectMastery[] = template.subjects.map((subject) => {
    const topicPaths = subject.domains.flatMap((d) => d.topics.map((t) => t.id))
    const totalTopics = topicPaths.length

    let totalMastery = 0
    let completedCount = 0

    for (const path of topicPaths) {
      const node = nodeMap.get(path)
      totalMastery += node?.mastery_score ?? 0
      if (node?.coverage_status === 'completed') completedCount++
    }

    const mastery = totalTopics > 0 ? totalMastery / totalTopics : 0
    const status = mastery >= 75 ? 'passing' : mastery >= 65 ? 'developing' : 'at_risk'

    return {
      subject_id: subject.id,
      subject_label: subject.label,
      subject_code: subject.code,
      mastery_score: Math.round(mastery * 10) / 10,
      topic_count: totalTopics,
      completed_count: completedCount,
      status,
    }
  })

  const overallScore =
    subjects.length > 0
      ? subjects.reduce((sum, s) => sum + s.mastery_score, 0) / subjects.length
      : 0

  const atRiskCount = subjects.filter((s) => s.mastery_score < 65).length
  let passStatus: PassingStatus['status']

  if (overallScore >= 75 && atRiskCount === 0) {
    passStatus = 'PASSING'
  } else if (overallScore >= 75 && atRiskCount <= 2) {
    passStatus = 'CONDITIONAL'
  } else {
    passStatus = 'FAILING'
  }

  // Leak detector: topics dragging down the average the most
  const topicLeaks: LeakEntry[] = []

  for (const subject of template.subjects) {
    const subjectMastery = subjects.find((s) => s.subject_id === subject.id)?.mastery_score ?? 0
    for (const domain of subject.domains) {
      for (const topic of domain.topics) {
        const node = nodeMap.get(topic.id)
        const topicMastery = node?.mastery_score ?? 0
        const drag = subjectMastery - topicMastery
        if (drag > 0) {
          topicLeaks.push({
            node_path: topic.id,
            label: topic.label,
            subject_code: subject.code,
            mastery_score: topicMastery,
            drag,
          })
        }
      }
    }
  }

  const top_leaks = topicLeaks
    .sort((a, b) => b.drag - a.drag)
    .slice(0, 3)

  return {
    overall_score: Math.round(overallScore * 10) / 10,
    status: passStatus,
    subjects,
    top_leaks,
  }
}
