/**
 * Gamification — PLAN-V2.md Phase 7. Display-side logic only: all awarding
 * happens in the database (migration 0007). These mirror that function's math.
 */

export const MAX_LEVEL = 10;

/** Cumulative XP needed to *reach* level n (level n = 250·n²). */
export function xpForLevel(n: number): number {
  return 250 * n * n;
}

export function levelFromXp(xp: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(Math.sqrt(xp / 250))));
}

/** Progress through the current level, 0–1. */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return 1;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return Math.min(1, Math.max(0, (xp - floor) / (ceil - floor)));
}

/** CPA-journey titles, index = level (1-based). */
export const LEVEL_TITLES = [
  "",
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Reviewee",
  "Mock Topnotcher",
  "Board Ready",
  "Passer",
  "Topnotcher",
] as const;

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
};

/** Mirrors the badge ids awarded by award_for_session() — keep in sync with 0007. */
export const BADGES: BadgeDef[] = [
  { id: "first-steps", name: "First Steps", description: "Complete your first session." },
  { id: "century", name: "Century", description: "Answer 100 questions." },
  { id: "marathon", name: "Marathon", description: "Answer 1,000 questions." },
  { id: "week-streak", name: "Week Streak", description: "Practice 7 days in a row." },
  { id: "month-streak", name: "Month Streak", description: "Practice 30 days in a row." },
  { id: "first-mastery", name: "First Mastery", description: "Push any topic to Mastered (85+)." },
  { id: "subject-secured", name: "Subject Secured", description: "Lift a whole subject past the 75 pass line." },
  { id: "all-six-started", name: "All Six Started", description: "Practice every board subject at least once." },
  { id: "mock-debut", name: "Mock Debut", description: "Complete your first mock exam." },
  { id: "mock-passer", name: "Mock Passer", description: "Score 75+ on a mock exam." },
  { id: "queue-zero", name: "Queue Zero", description: "Clear your entire review queue." },
  { id: "goal-14", name: "Night Before", description: "Hit your daily goal 14 days straight." },
];

export const badgeById = new Map(BADGES.map((b) => [b.id, b]));
