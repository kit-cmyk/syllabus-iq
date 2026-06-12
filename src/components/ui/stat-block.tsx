import { cn } from "@/lib/cn";

/** Big numeral + gray label — the "5,000+ Members" pattern. */
export function StatBlock({
  value,
  label,
  gradient = false,
  className,
}: {
  value: React.ReactNode;
  label: string;
  gradient?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={cn(
          "text-[32px] leading-tight font-bold tabular-nums",
          gradient ? "text-brand-gradient" : "text-ink-900"
        )}
      >
        {value}
      </div>
      <div className="text-[13px] font-medium text-ink-400">{label}</div>
    </div>
  );
}
