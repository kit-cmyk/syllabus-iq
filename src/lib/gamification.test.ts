import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  levelFromXp,
  levelProgress,
  LEVEL_TITLES,
  BADGES,
  MAX_LEVEL,
} from "./gamification";

describe("levels", () => {
  it("thresholds follow 250·n²", () => {
    expect(xpForLevel(2)).toBe(1000);
    expect(xpForLevel(10)).toBe(25000);
  });

  it("levelFromXp matches thresholds exactly at the boundary", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(999)).toBe(1);
    expect(levelFromXp(1000)).toBe(2);
    expect(levelFromXp(24999)).toBe(9);
    expect(levelFromXp(25000)).toBe(10);
    expect(levelFromXp(999999)).toBe(MAX_LEVEL); // capped
  });

  it("levelProgress is 0 at a threshold, ~1 just before the next, 1 at cap", () => {
    expect(levelProgress(1000)).toBe(0);
    expect(levelProgress(2249)).toBeCloseTo(0.999, 2);
    expect(levelProgress(25000)).toBe(1);
  });

  it("every level has a title", () => {
    for (let n = 1; n <= MAX_LEVEL; n++) {
      expect(LEVEL_TITLES[n]).toBeTruthy();
    }
  });
});

describe("badge catalog", () => {
  it("has 12 badges with unique ids matching the SQL award function", () => {
    expect(BADGES).toHaveLength(12);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(12);
    // spot-check ids that must match 0007_gamification.sql exactly
    for (const id of ["first-steps", "week-streak", "subject-secured", "queue-zero", "goal-14"]) {
      expect(BADGES.some((b) => b.id === id)).toBe(true);
    }
  });
});
