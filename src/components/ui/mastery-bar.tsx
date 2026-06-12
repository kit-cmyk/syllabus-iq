import { cn } from "@/lib/cn";
import { bandFor, PASS_LINE, SUBJECT_FLOOR } from "@/lib/mastery";
import { BAND_FILL } from "./band";

/** 8px progress bar in band color, with 65/75 pass-line ticks. */
export function MasteryBar({
  score,
  hasAttempts = true,
  showTicks = true,
  className,
}: {
  score: number;
  hasAttempts?: boolean;
  showTicks?: boolean;
  className?: string;
}) {
  const band = bandFor(score, hasAttempts);
  return (
    <div className={cn("relative h-2 w-full rounded-full bg-line", className)}>
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full", BAND_FILL[band])}
        style={{ width: `${Math.max(score, 0)}%` }}
      />
      {showTicks && (
        <>
          <div
            className="absolute -inset-y-0.5 w-0.5 bg-ink-400/60"
            style={{ left: `${SUBJECT_FLOOR}%` }}
          />
          <div
            className="absolute -inset-y-0.5 w-0.5 bg-ink-400"
            style={{ left: `${PASS_LINE}%` }}
          />
        </>
      )}
    </div>
  );
}
