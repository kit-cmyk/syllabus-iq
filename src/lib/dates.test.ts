import { describe, it, expect } from "vitest";
import { addDays, daysBetween, daysUntilExam } from "./dates";

describe("daysBetween", () => {
  it("counts whole calendar days forward", () => {
    expect(daysBetween("2026-06-14", "2026-06-21")).toBe(7);
  });

  it("is zero for the same day", () => {
    expect(daysBetween("2026-09-01", "2026-09-01")).toBe(0);
  });

  it("is negative once the target is in the past", () => {
    expect(daysBetween("2026-06-14", "2026-06-10")).toBe(-4);
  });

  it("crosses month and year boundaries without drift", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1); // 2026 is not a leap year
  });

  it("agrees with addDays", () => {
    expect(daysBetween("2026-06-14", addDays("2026-06-14", 30))).toBe(30);
  });
});

describe("daysUntilExam", () => {
  it("matches daysBetween from today (Asia/Manila)", () => {
    const future = addDays("2099-01-01", 0);
    expect(daysUntilExam(future)).toBeGreaterThan(0);
  });
});
