'use client'

interface Props {
  score: number // 0-100
  size?: number
}

export default function MasteryRing({ score, size = 36 }: Props) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 75 ? '#06bee1' : score >= 50 ? '#f59e0b' : score > 0 ? '#ef4444' : '#374151'

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size <= 36 ? 9 : 11}
        fill="white"
        className="rotate-90"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {score > 0 ? `${Math.round(score)}%` : '—'}
      </text>
    </svg>
  )
}
