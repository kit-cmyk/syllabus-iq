/**
 * Insight engine — PLAN-V2.md Phase 6. Pure functions, no IO.
 *
 * Turns the data the dashboard already loads into at most three plain-language
 * cards: what's wrong, why, and the one thing to do about it.
 */

import { PASS_LINE, SUBJECT_FLOOR } from "./mastery";

// Thresholds (exported so tests pin them and tuning is one-line)
export const LAG_GAP = 10; // subject this far under the user's average lags
export const PILEUP_DUE = 15; // due reviews that count as a pile-up
export const TREND_WINDOW = 10; // attempts per window for slipping/climbing
export const TREND_DELTA = 0.2; // accuracy change that counts as a trend
export const COVERAGE_MIN_WEIGHT = 8; // % of exam an untouched topic must carry
export const PACE_RATIO = 1.2; // recent avg seconds vs budget
export const PACE_MIN_ATTEMPTS = 20; // timed attempts before pace is judged
export const MAX_INSIGHTS = 3;

export type InsightTopic = {
  id: string;
  name: string;
  mastery: number;
  tos_weight: number;
  distinctSeen: number;
  attempted: boolean;
};

export type InsightSubject = {
  code: string;
  readiness: number;
  attempted: boolean;
  secondsBudget: number; // per-item exam budget
  topics: InsightTopic[];
};

export type InsightAttempt = {
  topic_id: string;
  is_correct: boolean;
  seconds_taken: number | null;
  timed: boolean; // timed practice or mock — the only attempts pace is judged on
};

export type InsightInput = {
  subjects: InsightSubject[];
  /** most-recent-first */
  attempts: InsightAttempt[];
  reviewDue: number;
};

export type Insight = {
  id: string;
  severity: 0 | 1 | 2 | 3; // 0 = positive
  message: string;
  cta: { label: string; href: string };
};

/** Exam-point payoff of practicing a topic: deficit below the pass line × TOS weight. */
export function payoffScore(mastery: number, tosWeight: number): number {
  return Math.max(PASS_LINE - mastery, 0) * tosWeight;
}

function driverTopic(subject: InsightSubject): InsightTopic | null {
  const pool = subject.topics.filter((t) => t.attempted);
  const ranked = (pool.length ? pool : subject.topics)
    .slice()
    .sort((a, b) => payoffScore(b.mastery, b.tos_weight) - payoffScore(a.mastery, a.tos_weight));
  return ranked[0] ?? null;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function deriveInsights(input: InsightInput): Insight[] {
  const { subjects, attempts, reviewDue } = input;
  const attempted = subjects.filter((s) => s.attempted);
  const candidates: (Insight & { impact: number; subjectCode?: string })[] = [];

  // 1. Pass blocker — a subject under the 65 floor blocks the whole exam
  for (const s of attempted) {
    if (s.readiness < SUBJECT_FLOOR) {
      const driver = driverTopic(s);
      candidates.push({
        id: `pass-blocker:${s.code}`,
        severity: 3,
        subjectCode: s.code,
        impact: (SUBJECT_FLOOR - s.readiness) * 100,
        message: `${s.code} (${s.readiness}) is below the ${SUBJECT_FLOOR} floor — on exam day it would block everything else.`,
        cta: driver
          ? {
              label: `Practice ${driver.name}`,
              href: `/practice?subject=${s.code.toLowerCase()}&topic=${driver.id}`,
            }
          : { label: `Practice ${s.code}`, href: `/practice?subject=${s.code.toLowerCase()}` },
      });
    }
  }

  // 2. Lagging subject — "average overall, but failing X because of Y"
  if (attempted.length >= 2) {
    const mean = attempted.reduce((a, s) => a + s.readiness, 0) / attempted.length;
    for (const s of attempted) {
      if (s.readiness < mean - LAG_GAP) {
        const driver = driverTopic(s);
        if (!driver) continue;
        candidates.push({
          id: `lagging:${s.code}`,
          severity: 2,
          subjectCode: s.code,
          impact: payoffScore(driver.mastery, driver.tos_weight),
          message: `Your subjects average ${Math.round(mean)}, but ${s.code} sits at ${s.readiness} — mostly ${driver.name} (${driver.mastery}). Review it.`,
          cta: {
            label: `Review ${driver.name}`,
            href: `/subjects/${s.code.toLowerCase()}/${driver.id}`,
          },
        });
      }
    }
  }

  // 3. Review pile-up
  if (reviewDue >= PILEUP_DUE) {
    candidates.push({
      id: "review-pileup",
      severity: 2,
      impact: reviewDue,
      message: `${reviewDue} reviews due — clear them before they snowball; misses fade fast.`,
      cta: { label: "Start review", href: "/review" },
    });
  }

  // 4 & 7. Trends — per-topic accuracy, last window vs the one before
  const byTopic = new Map<string, boolean[]>();
  for (const a of attempts) {
    const list = byTopic.get(a.topic_id) ?? [];
    if (list.length < TREND_WINDOW * 2) list.push(a.is_correct);
    byTopic.set(a.topic_id, list);
  }
  const topicIndex = new Map(
    subjects.flatMap((s) => s.topics.map((t) => [t.id, { topic: t, subject: s }] as const))
  );
  for (const [topicId, series] of byTopic) {
    if (series.length < TREND_WINDOW * 2) continue;
    const found = topicIndex.get(topicId);
    if (!found) continue;
    const { topic, subject } = found;
    const acc = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;
    const recent = acc(series.slice(0, TREND_WINDOW));
    const previous = acc(series.slice(TREND_WINDOW, TREND_WINDOW * 2));
    if (recent <= previous - TREND_DELTA) {
      candidates.push({
        id: `declining:${topicId}`,
        severity: 2,
        subjectCode: subject.code,
        impact: payoffScore(topic.mastery, topic.tos_weight),
        message: `${topic.name} is slipping: ${pct(previous)} → ${pct(recent)} over your last ${TREND_WINDOW} answers.`,
        cta: {
          label: `Practice ${topic.name}`,
          href: `/practice?subject=${subject.code.toLowerCase()}&topic=${topicId}`,
        },
      });
    } else if (recent >= previous + TREND_DELTA) {
      candidates.push({
        id: `improving:${topicId}`,
        severity: 0,
        subjectCode: subject.code,
        impact: recent - previous,
        message: `${topic.name} is climbing: ${pct(previous)} → ${pct(recent)}. It's working — lock it in.`,
        cta: {
          label: `Practice ${topic.name}`,
          href: `/practice?subject=${subject.code.toLowerCase()}&topic=${topicId}`,
        },
      });
    }
  }

  // 5. Coverage gap — heavy topic never touched in an otherwise-started subject
  for (const s of attempted) {
    const gap = s.topics
      .filter((t) => t.distinctSeen === 0 && t.tos_weight >= COVERAGE_MIN_WEIGHT)
      .sort((a, b) => b.tos_weight - a.tos_weight)[0];
    if (gap) {
      candidates.push({
        id: `coverage:${gap.id}`,
        severity: 1,
        subjectCode: s.code,
        impact: gap.tos_weight,
        message: `You've never touched ${gap.name} — it's ${gap.tos_weight}% of ${s.code}.`,
        cta: {
          label: `Start ${gap.name}`,
          href: `/subjects/${s.code.toLowerCase()}/${gap.id}`,
        },
      });
    }
  }

  // 6. Pace risk — timed answers consistently over the exam budget
  for (const s of attempted) {
    const topicIds = new Set(s.topics.map((t) => t.id));
    const timed = attempts.filter(
      (a) => a.timed && a.seconds_taken != null && topicIds.has(a.topic_id)
    );
    if (timed.length < PACE_MIN_ATTEMPTS) continue;
    const avg =
      timed.reduce((sum, a) => sum + (a.seconds_taken ?? 0), 0) / timed.length;
    if (avg > s.secondsBudget * PACE_RATIO) {
      candidates.push({
        id: `pace:${s.code}`,
        severity: 1,
        subjectCode: s.code,
        impact: avg / s.secondsBudget,
        message: `You're averaging ${Math.round(avg)}s per ${s.code} item; exam budget is ${s.secondsBudget}s.`,
        cta: {
          label: `Timed ${s.code} practice`,
          href: `/practice?subject=${s.code.toLowerCase()}`,
        },
      });
    }
  }

  // Selection: severity desc, then exam impact; one insight per subject;
  // a positive insight, if earned, always gets slot 3.
  const negatives = candidates
    .filter((c) => c.severity > 0)
    .sort((a, b) => b.severity - a.severity || b.impact - a.impact);
  const positives = candidates
    .filter((c) => c.severity === 0)
    .sort((a, b) => b.impact - a.impact);

  const chosen: typeof candidates = [];
  const usedSubjects = new Set<string>();
  for (const c of negatives) {
    if (chosen.length >= MAX_INSIGHTS) break;
    if (c.subjectCode && usedSubjects.has(c.subjectCode)) continue;
    chosen.push(c);
    if (c.subjectCode) usedSubjects.add(c.subjectCode);
  }
  if (positives.length) {
    const positive = positives.find(
      (p) => !p.subjectCode || !usedSubjects.has(p.subjectCode)
    ) ?? positives[0];
    if (chosen.length >= MAX_INSIGHTS) chosen[MAX_INSIGHTS - 1] = positive;
    else chosen.push(positive);
  }

  return chosen.map(({ id, severity, message, cta }) => ({ id, severity, message, cta }));
}
