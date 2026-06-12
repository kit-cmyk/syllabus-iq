/**
 * Mock exam blueprinting — PLAN.md Phase 4. Pure functions, no IO.
 *
 * Items per topic follow the TOS weights (largest-remainder method), capped by
 * how many questions each topic actually has, with any shortfall redistributed
 * to topics that still have spare questions (heaviest weight first).
 */

/** A subject's mock unlocks when its bank holds 3× the exam item count. */
export const MOCK_BANK_MULTIPLIER = 3;

export type AllocatableTopic = {
  id: string;
  tos_weight: number;
  available: number;
};

export function allocateMockItems(
  topics: AllocatableTopic[],
  itemCount: number
): Map<string, number> {
  const result = new Map<string, number>();
  const totalAvailable = topics.reduce((s, t) => s + t.available, 0);
  const target = Math.min(itemCount, totalAvailable);
  if (target === 0) return result;

  const totalWeight = topics.reduce((s, t) => s + t.tos_weight, 0) || 1;

  // Largest-remainder apportionment
  const ideal = topics.map((t) => ({
    t,
    exact: (t.tos_weight / totalWeight) * target,
  }));
  for (const { t, exact } of ideal) result.set(t.id, Math.floor(exact));
  let assigned = [...result.values()].reduce((a, b) => a + b, 0);
  const byRemainder = [...ideal].sort(
    (a, b) =>
      b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) ||
      b.t.tos_weight - a.t.tos_weight
  );
  for (const { t } of byRemainder) {
    if (assigned >= target) break;
    result.set(t.id, (result.get(t.id) ?? 0) + 1);
    assigned++;
  }

  // Cap by availability, then redistribute the shortfall
  let shortfall = 0;
  for (const t of topics) {
    const want = result.get(t.id) ?? 0;
    if (want > t.available) {
      shortfall += want - t.available;
      result.set(t.id, t.available);
    }
  }
  const spare = topics
    .filter((t) => (result.get(t.id) ?? 0) < t.available)
    .sort((a, b) => b.tos_weight - a.tos_weight);
  while (shortfall > 0) {
    let placed = false;
    for (const t of spare) {
      if (shortfall === 0) break;
      const cur = result.get(t.id) ?? 0;
      if (cur < t.available) {
        result.set(t.id, cur + 1);
        shortfall--;
        placed = true;
      }
    }
    if (!placed) break; // every topic is at capacity
  }
  return result;
}

export function mockUnlockTarget(examItemCount: number): number {
  return examItemCount * MOCK_BANK_MULTIPLIER;
}

/** Per-item time budget in seconds (e.g. FAR: 180min × 60 / 70 items ≈ 154s). */
export function secondsPerItem(examMinutes: number, examItemCount: number): number {
  return Math.round((examMinutes * 60) / examItemCount);
}
