import type { CoverageStatus } from '@/types/exam'

const CONFIG: Record<CoverageStatus, { label: string; className: string }> = {
  unread: { label: 'Unread', className: 'bg-gray-700/50 text-gray-400 border-gray-600/50' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  completed: { label: 'Done', className: 'bg-brand-sky/20 text-brand-sky border-brand-sky/30' },
}

export default function CoverageChip({ status }: { status: CoverageStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  )
}
