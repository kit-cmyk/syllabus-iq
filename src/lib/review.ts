/**
 * Review-queue ladder — PLAN.md Phase 5. Pure functions, no IO.
 *
 * A missed question enters at step 0 (due tomorrow). Each correct review
 * advances one step: 1 → 3 → 7 → 16 days. Correct at the final step clears
 * the item. Any wrong answer resets to step 0 and counts the miss.
 */

export const REVIEW_INTERVALS = [1, 3, 7, 16] as const;
export const REVIEW_SESSION_SIZE = 10; // top up with refreshers below this

export type ReviewItemState = {
  interval_step: number;
  miss_count: number;
};

export type ReviewOutcome =
  | { cleared: true }
  | { cleared: false; interval_step: number; miss_count: number; dueInDays: number };

export function applyReviewAnswer(
  state: ReviewItemState,
  isCorrect: boolean
): ReviewOutcome {
  if (!isCorrect) {
    return {
      cleared: false,
      interval_step: 0,
      miss_count: state.miss_count + 1,
      dueInDays: REVIEW_INTERVALS[0],
    };
  }
  const next = state.interval_step + 1;
  if (next >= REVIEW_INTERVALS.length) return { cleared: true };
  return {
    cleared: false,
    interval_step: next,
    miss_count: state.miss_count,
    dueInDays: REVIEW_INTERVALS[next],
  };
}

/** Fresh enrollment when a question is missed outside a review session. */
export function enrolledState(existing?: ReviewItemState): {
  interval_step: number;
  miss_count: number;
  dueInDays: number;
} {
  return {
    interval_step: 0,
    miss_count: (existing?.miss_count ?? 0) + 1,
    dueInDays: REVIEW_INTERVALS[0],
  };
}
