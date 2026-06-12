import { describe, it, expect } from "vitest";
import { applyReviewAnswer, enrolledState } from "./review";
import { addDays, manilaDay } from "./dates";

describe("review ladder", () => {
  it("walks the full ladder: 1 → 3 → 7 → 16 → cleared", () => {
    let state = { interval_step: 0, miss_count: 1 };
    const r1 = applyReviewAnswer(state, true);
    expect(r1).toEqual({ cleared: false, interval_step: 1, miss_count: 1, dueInDays: 3 });
    state = r1 as typeof state & { dueInDays: number };
    const r2 = applyReviewAnswer(state, true);
    expect(r2).toEqual({ cleared: false, interval_step: 2, miss_count: 1, dueInDays: 7 });
    state = r2 as typeof state & { dueInDays: number };
    const r3 = applyReviewAnswer(state, true);
    expect(r3).toEqual({ cleared: false, interval_step: 3, miss_count: 1, dueInDays: 16 });
    state = r3 as typeof state & { dueInDays: number };
    expect(applyReviewAnswer(state, true)).toEqual({ cleared: true });
  });

  it("wrong at step 3 resets to step 0, due tomorrow, miss counted", () => {
    expect(applyReviewAnswer({ interval_step: 3, miss_count: 2 }, false)).toEqual({
      cleared: false,
      interval_step: 0,
      miss_count: 3,
      dueInDays: 1,
    });
  });

  it("fresh enrollment starts at step 0 due tomorrow; re-miss increments the count", () => {
    expect(enrolledState()).toEqual({ interval_step: 0, miss_count: 1, dueInDays: 1 });
    expect(enrolledState({ interval_step: 2, miss_count: 4 })).toEqual({
      interval_step: 0,
      miss_count: 5,
      dueInDays: 1,
    });
  });
});

describe("manila dates", () => {
  it("addDays does plain calendar math across month boundaries", () => {
    expect(addDays("2026-06-29", 3)).toBe("2026-07-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-02-27", 16)).toBe("2026-03-15");
  });

  it("manilaDay is timezone-correct at the midnight boundary", () => {
    // 16:30 UTC = 00:30 next day in Manila (UTC+8)
    expect(manilaDay("2026-06-12T16:30:00Z")).toBe("2026-06-13");
    expect(manilaDay("2026-06-12T15:59:00Z")).toBe("2026-06-12");
  });
});
