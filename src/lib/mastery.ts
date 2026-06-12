import type { Band, ReadinessStatus } from "./types";

/**
 * Mastery engine — PLAN.md §3. Pure functions, no IO.
 *
 * mastery = weightedAccuracy × coverage × 100
 *   weightedAccuracy: recency-weighted (0.9 decay) so recent attempts dominate
 *   coverage: min(distinctSeen / 15, 1) so a short streak can't claim mastery
 */

export const RECENCY_DECAY = 0.9;
export const COVERAGE_TARGET = 15;
export const PASS_LINE = 75;
export const SUBJECT_FLOOR = 65;
export const STALE_DAYS = 14;
export const SECONDS_PER_QUESTION = 90; // timed-practice budget

export type AttemptLike = {
  question_id: string;
  is_correct: boolean;
};

export type MasteryResult = {
  score: number;
  distinctSeen: number;
  weightedAccuracy: number;
  coverage: number;
};

/** `attempts` must be ordered most-recent-first. */
export function computeMastery(attempts: AttemptLike[]): MasteryResult {
  if (attempts.length === 0) {
    return { score: 0, distinctSeen: 0, weightedAccuracy: 0, coverage: 0 };
  }
  let num = 0;
  let den = 0;
  let w = 1;
  for (const a of attempts) {
    if (a.is_correct) num += w;
    den += w;
    w *= RECENCY_DECAY;
  }
  const weightedAccuracy = num / den;
  const distinctSeen = new Set(attempts.map((a) => a.question_id)).size;
  const coverage = Math.min(distinctSeen / COVERAGE_TARGET, 1);
  return {
    score: Math.round(weightedAccuracy * coverage * 100),
    distinctSeen,
    weightedAccuracy,
    coverage,
  };
}

export function bandFor(score: number, hasAttempts: boolean): Band {
  if (!hasAttempts) return "not-started";
  if (score >= 85) return "mastered";
  if (score >= PASS_LINE) return "proficient";
  if (score >= 60) return "developing";
  return "learning";
}

export const BAND_LABEL: Record<Band, string> = {
  "not-started": "Not started",
  learning: "Learning",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

export function isStale(lastAttemptAt: string | Date, now = new Date()): boolean {
  const last = new Date(lastAttemptAt).getTime();
  return now.getTime() - last > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Subject readiness = Σ topicMastery × (tos_weight / 100).
 * Untouched topics contribute 0 — honest by design (PLAN.md §3).
 */
export function subjectReadiness(
  topics: { tos_weight: number; mastery: number }[]
): number {
  const total = topics.reduce((s, t) => s + t.tos_weight, 0);
  if (total === 0) return 0;
  const sum = topics.reduce((s, t) => s + t.mastery * t.tos_weight, 0);
  return sum / total;
}

export function readinessStatus(subjectScores: number[]): ReadinessStatus {
  if (subjectScores.length === 0) return "NOT_YET";
  const allAboveFloor = subjectScores.every((s) => s >= SUBJECT_FLOOR);
  const passing = subjectScores.filter((s) => s >= PASS_LINE).length;
  const overall =
    subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
  if (overall >= PASS_LINE && allAboveFloor) return "PASS";
  // Conditional (RA 9298): ≥75 in a majority of subjects (4 of 6), none below the floor.
  if (passing > subjectScores.length / 2 && allAboveFloor) return "CONDITIONAL";
  return "NOT_YET";
}
