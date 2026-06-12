import { cn } from "@/lib/cn";
import { BAND_LABEL } from "@/lib/mastery";
import type { Band } from "@/lib/types";

/** Band color classes — the only place band colors are mapped (DESIGN.md guardrail #3). */
export const BAND_TEXT: Record<Band, string> = {
  "not-started": "text-notstarted",
  learning: "text-learning",
  developing: "text-developing",
  proficient: "text-proficient",
  mastered: "text-mastered",
};

export const BAND_BG: Record<Band, string> = {
  "not-started": "bg-notstarted-bg",
  learning: "bg-learning-bg",
  developing: "bg-developing-bg",
  proficient: "bg-proficient-bg",
  mastered: "bg-mastered-bg",
};

export const BAND_FILL: Record<Band, string> = {
  "not-started": "bg-notstarted",
  learning: "bg-learning",
  developing: "bg-developing",
  proficient: "bg-proficient",
  mastered: "bg-mastered",
};

export function BandChip({ band, className }: { band: Band; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium",
        BAND_TEXT[band],
        BAND_BG[band],
        className
      )}
    >
      {BAND_LABEL[band]}
    </span>
  );
}
