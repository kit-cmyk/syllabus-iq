'use client'

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

interface Props {
  overallScore: number
  status: 'PASSING' | 'CONDITIONAL' | 'FAILING'
}

const CONFIG = {
  PASSING: {
    emoji: '🏆',
    label: 'Passing',
    sublabel: 'All systems go! Keep your average above 75% and no subject below 65%.',
    className: 'bg-brand-sky/10 border-brand-sky/30 text-brand-sky',
    scoreClass: 'text-brand-sky',
  },
  CONDITIONAL: {
    emoji: '⚠️',
    label: 'Conditional Pass',
    sublabel: 'Overall average is passing, but 1-2 subjects are below 65%.',
    className: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    scoreClass: 'text-amber-300',
  },
  FAILING: {
    emoji: '📉',
    label: 'Needs Improvement',
    sublabel: 'Overall average below 75%, or 3+ subjects are below 65%.',
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
    scoreClass: 'text-red-400',
  },
}

export default function StatusBanner({ overallScore, status }: Props) {
  const { emoji, label, sublabel, className, scoreClass } = CONFIG[status]
  const prevStatus = useRef(status)

  useEffect(() => {
    if (status === 'PASSING' && prevStatus.current !== 'PASSING') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.4 } })
    }
    prevStatus.current = status
  }, [status])

  return (
    <div className={`rounded-2xl border p-5 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="text-4xl">{emoji}</div>
        <div className="flex-1">
          <div className="font-bold text-lg">{label}</div>
          <div className="text-sm opacity-80 mt-0.5">{sublabel}</div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${scoreClass}`}>{overallScore}%</div>
          <div className="text-xs opacity-70">estimated score</div>
        </div>
      </div>

      {/* Score thresholds */}
      <div className="mt-4 flex gap-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-brand-sky" />
          <span className="opacity-70">≥75% avg = Passing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="opacity-70">≥65% per subject = No conditional</span>
        </div>
      </div>
    </div>
  )
}
