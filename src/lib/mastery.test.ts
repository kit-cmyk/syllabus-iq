import { describe, it, expect } from "vitest";
import {
  computeMastery,
  bandFor,
  subjectReadiness,
  readinessStatus,
  isStale,
} from "./mastery";

const right = (q: string) => ({ question_id: q, is_correct: true });
const wrong = (q: string) => ({ question_id: q, is_correct: false });

describe("computeMastery", () => {
  it("returns zeros for empty history", () => {
    expect(computeMastery([])).toEqual({
      score: 0,
      distinctSeen: 0,
      weightedAccuracy: 0,
      coverage: 0,
    });
  });

  it("caps a short all-correct streak via coverage (3/3 ≠ mastered)", () => {
    const r = computeMastery([right("a"), right("b"), right("c")]);
    expect(r.weightedAccuracy).toBe(1);
    expect(r.coverage).toBeCloseTo(3 / 15);
    expect(r.score).toBe(20); // shows "Learning", not "Mastered"
    expect(bandFor(r.score, true)).toBe("learning");
  });

  it("rewards improvement: old misses fade behind recent correct answers", () => {
    // 10 old wrong, then 15 recent right (most-recent-first ordering)
    const attempts = [
      ...Array.from({ length: 15 }, (_, i) => right(`r${i}`)),
      ...Array.from({ length: 10 }, (_, i) => wrong(`w${i}`)),
    ];
    const r = computeMastery(attempts);
    expect(r.coverage).toBe(1);
    expect(r.score).toBeGreaterThanOrEqual(85); // recent form dominates
  });

  it("punishes regression: recent misses outweigh old streaks", () => {
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => wrong(`w${i}`)),
      ...Array.from({ length: 15 }, (_, i) => right(`r${i}`)),
    ];
    const r = computeMastery(attempts);
    expect(r.score).toBeLessThan(40);
  });

  it("counts distinct questions, not raw attempts, for coverage", () => {
    const attempts = Array.from({ length: 30 }, () => right("same-question"));
    expect(computeMastery(attempts).distinctSeen).toBe(1);
    expect(computeMastery(attempts).score).toBe(7); // 1/15 coverage
  });

  it("matches a hand-computed mixed case", () => {
    // most-recent-first: right, wrong, right → (1 + 0 + 0.81) / (1 + 0.9 + 0.81) = 0.6679
    const r = computeMastery([right("a"), wrong("b"), right("c")]);
    expect(r.weightedAccuracy).toBeCloseTo(0.6679, 3);
    expect(r.score).toBe(Math.round(0.66789 * (3 / 15) * 100)); // 13
  });
});

describe("bandFor", () => {
  it("maps boundaries to PLAN.md bands", () => {
    expect(bandFor(0, false)).toBe("not-started");
    expect(bandFor(59, true)).toBe("learning");
    expect(bandFor(60, true)).toBe("developing");
    expect(bandFor(74, true)).toBe("developing");
    expect(bandFor(75, true)).toBe("proficient"); // pass line
    expect(bandFor(84, true)).toBe("proficient");
    expect(bandFor(85, true)).toBe("mastered");
  });
});

describe("subjectReadiness", () => {
  it("weights topic mastery by TOS weight", () => {
    const r = subjectReadiness([
      { tos_weight: 50, mastery: 80 },
      { tos_weight: 50, mastery: 60 },
    ]);
    expect(r).toBe(70);
  });

  it("counts untouched topics as zero", () => {
    const r = subjectReadiness([
      { tos_weight: 50, mastery: 90 },
      { tos_weight: 50, mastery: 0 }, // never practiced
    ]);
    expect(r).toBe(45);
  });
});

describe("readinessStatus", () => {
  it("PASS: average ≥75 and every subject ≥65", () => {
    expect(readinessStatus([80, 78, 76, 75, 75, 70])).toBe("PASS");
  });
  it("one subject below the 65 floor blocks PASS even with a high average", () => {
    expect(readinessStatus([95, 95, 95, 95, 95, 64])).toBe("NOT_YET");
  });
  it("CONDITIONAL: 4 of 6 at ≥75, rest at/above floor, average below 75", () => {
    expect(readinessStatus([75, 75, 75, 75, 65, 65])).toBe("CONDITIONAL");
  });
  it("NOT_YET: only 3 of 6 passing", () => {
    expect(readinessStatus([80, 80, 80, 65, 65, 65])).toBe("NOT_YET");
  });
});

describe("isStale", () => {
  it("flags topics untouched for more than 14 days", () => {
    const now = new Date("2026-06-12T00:00:00Z");
    expect(isStale("2026-05-25T00:00:00Z", now)).toBe(true);
    expect(isStale("2026-06-01T00:00:00Z", now)).toBe(false);
  });
});
