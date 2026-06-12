import { describe, it, expect } from "vitest";
import { allocateMockItems, secondsPerItem } from "./mock";

const topic = (id: string, w: number, available = 1000) => ({
  id,
  tos_weight: w,
  available,
});

const total = (m: Map<string, number>) =>
  [...m.values()].reduce((a, b) => a + b, 0);

describe("allocateMockItems", () => {
  it("matches TOS proportions on the real FAR blueprint (70 items)", () => {
    // FAR weights from the syllabus seed
    const weights = [10, 6, 8, 8, 12, 7, 8, 10, 6, 7, 8, 6, 4];
    const topics = weights.map((w, i) => topic(`t${i}`, w));
    const alloc = allocateMockItems(topics, 70);
    expect(total(alloc)).toBe(70);
    // every topic within 1 item of its exact share (largest-remainder property)
    for (const [i, w] of weights.entries()) {
      const exact = (w / 100) * 70;
      expect(Math.abs(alloc.get(`t${i}`)! - exact)).toBeLessThan(1);
    }
    // heaviest topic gets the most items
    expect(alloc.get("t4")).toBe(Math.round(0.12 * 70)); // 12% → 8 items
  });

  it("hands remainder seats to the largest fractional shares", () => {
    // 3 topics × 33.33% of 10 items → 4/3/3, never 3/3/3 or 4/4/4
    const alloc = allocateMockItems(
      [topic("a", 33.34), topic("b", 33.33), topic("c", 33.33)],
      10
    );
    expect(total(alloc)).toBe(10);
    expect([...alloc.values()].sort((x, y) => y - x)).toEqual([4, 3, 3]);
  });

  it("respects topic availability and redistributes the shortfall", () => {
    const alloc = allocateMockItems(
      [topic("thin", 50, 2), topic("deep", 30), topic("mid", 20)],
      20
    );
    expect(total(alloc)).toBe(20);
    expect(alloc.get("thin")).toBe(2); // capped at its 2 available questions
    expect(alloc.get("deep")! + alloc.get("mid")!).toBe(18);
    expect(alloc.get("deep")!).toBeGreaterThan(alloc.get("mid")!); // heavier weight first
  });

  it("caps at the total bank size when the bank is smaller than the exam", () => {
    const alloc = allocateMockItems([topic("a", 60, 3), topic("b", 40, 4)], 70);
    expect(total(alloc)).toBe(7);
  });

  it("returns empty for an empty bank", () => {
    expect(total(allocateMockItems([topic("a", 100, 0)], 70))).toBe(0);
  });

  it("is stable across many runs (no randomness in apportionment)", () => {
    const topics = [topic("a", 14), topic("b", 12), topic("c", 10), topic("d", 8)];
    const first = allocateMockItems(topics, 100);
    for (let i = 0; i < 50; i++) {
      expect(allocateMockItems(topics, 100)).toEqual(first);
    }
  });
});

describe("secondsPerItem", () => {
  it("computes the real exam budgets", () => {
    expect(secondsPerItem(180, 70)).toBe(154); // FAR/AFAR/MAS/AUD/TAX
    expect(secondsPerItem(180, 100)).toBe(108); // RFBT
  });
});
