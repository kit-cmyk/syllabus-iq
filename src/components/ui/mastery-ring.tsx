import { cn } from "@/lib/cn";
import { bandFor } from "@/lib/mastery";
import type { Band } from "@/lib/types";

const RING_STROKE: Record<Band, string> = {
  "not-started": "stroke-notstarted",
  learning: "stroke-learning",
  developing: "stroke-developing",
  proficient: "stroke-proficient",
  mastered: "stroke-mastered",
};

/** Circular score ring with centered numeral. */
export function MasteryRing({
  score,
  hasAttempts = true,
  size = 96,
  label,
  className,
}: {
  score: number;
  hasAttempts?: boolean;
  size?: number;
  label?: string;
  className?: string;
}) {
  const band = bandFor(score, hasAttempts);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn("fill-none", RING_STROKE[band])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-ink-900 tabular-nums"
          style={{ fontSize: size / 3.2 }}
        >
          {score}
        </span>
        {label && <span className="text-[11px] text-ink-400">{label}</span>}
      </div>
    </div>
  );
}
