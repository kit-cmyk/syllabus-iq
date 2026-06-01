'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import type { SubjectMastery } from '@/types/exam'

export default function MasteryRadar({ subjects }: { subjects: SubjectMastery[] }) {
  const data = subjects.map((s) => ({
    subject: s.subject_code,
    mastery: s.mastery_score,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#93c5fd', fontSize: 11, fontWeight: 600 }}
        />
        <Radar
          name="Mastery"
          dataKey="mastery"
          stroke="#06bee1"
          fill="#06bee1"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        {/* 75% passing threshold */}
        <Radar
          name="Passing Line"
          dataKey="fullMark"
          stroke="rgba(6,190,225,0.2)"
          fill="none"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
