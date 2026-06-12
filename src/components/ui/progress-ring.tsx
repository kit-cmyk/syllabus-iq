import { cn } from "@/lib/cn";

/** Generic brand-violet progress ring (MasteryRing is band-colored and 0–100 only). */
export function ProgressRing({
  fraction,
  size = 72,
  stroke = 7,
  children,
  className,
}: {
  fraction: number; // 0–1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          className="fill-none stroke-brand"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
