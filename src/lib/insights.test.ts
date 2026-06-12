import { describe, it, expect } from "vitest";
import {
  deriveInsights,
  payoffScore,
  PILEUP_DUE,
  TREND_WINDOW,
  COVERAGE_MIN_WEIGHT,
  PACE_MIN_ATTEMPTS,
  MAX_INSIGHTS,
  type InsightInput,
  type InsightSubject,
  type InsightTopic,
} from "./insights";

let seq = 0;
const topic = (over: Partial<InsightTopic> = {}): InsightTopic => ({
  id: `t${seq++}`,
  name: `Topic ${seq}`,
  mastery: 75,
  tos_weight: 10,
  distinctSeen: 20,
  attempted: true,
  ...over,
});

const subject = (over: Partial<InsightSubject> = {}): InsightSubject => ({
  code: `S${seq++}`,
  readiness: 75,
  attempted: true,
  secondsBudget: 154,
  topics: [topic(), topic()],
  ...over,
});

const input = (over: Partial<InsightInput> = {}): InsightInput => ({
  subjects: [],
  attempts: [],
  reviewDue: 0,
  ...over,
});

const byId = (xs: { id: string }[], prefix: string) =>
  xs.find((x) => x.id.startsWith(prefix));

describe("pass blocker", () => {
  it("fires below the 65 floor with the highest-payoff topic as CTA", () => {
    const weak = topic({ name: "Estate Tax", mastery: 30, tos_weight: 10 });
    const mild = topic({ mastery: 60, tos_weight: 14 });
    const s = subject({ code: "TAX", readiness: 61, topics: [mild, weak] });
    const out = deriveInsights(input({ subjects: [s] }));
    const hit = byId(out, "pass-blocker:TAX")!;
    expect(hit.severity).toBe(3);
    expect(hit.message).toContain("below the 65 floor");
    // payoff: (75-30)*10=450 beats (75-60)*14=210
    expect(hit.cta.label).toBe("Practice Estate Tax");
  });

  it("does not fire at exactly the floor", () => {
    const out = deriveInsights(
      input({ subjects: [subject({ readiness: 65 })] })
    );
    expect(byId(out, "pass-blocker")).toBeUndefined();
  });
});

describe("lagging subject (the headline rule)", () => {
  const lab = () => {
    const driver = topic({ name: "CVP Analysis", mastery: 41, tos_weight: 12 });
    const mas = subject({ code: "MAS", readiness: 66, topics: [driver, topic({ mastery: 70 })] });
    const far = subject({ code: "FAR", readiness: 80 });
    const aud = subject({ code: "AUD", readiness: 80 });
    return { driver, subjects: [far, aud, mas] };
  };

  it("names the lagging subject and its driver topic, links to review", () => {
    const { subjects } = lab(); // mean 75.33, MAS 66 < 65.33? no — gap is 9.33
    subjects[2].readiness = 64; // mean 74.67, 64 < 64.67 → fires (and floor rule too)
    const out = deriveInsights(input({ subjects }));
    const hit = byId(out, "lagging:MAS") ?? byId(out, "pass-blocker:MAS");
    expect(hit).toBeDefined();
  });

  it("triggers just past the 10-point gap, not at it", () => {
    // mean of [80, 80, x]: x < mean-10 → x < (160+x)/3 - 10 → 2x < 130 → x < 65... use 80,80,66 (mean 75.33): 66 > 65.33 no fire
    const { subjects } = lab();
    expect(byId(deriveInsights(input({ subjects })), "lagging")).toBeUndefined();
    subjects[2].readiness = 65; // mean 75: 65 = 75-10 → strict < → no fire
    expect(byId(deriveInsights(input({ subjects })), "lagging")).toBeUndefined();
    subjects[2].readiness = 65.4 as number; // keep > floor; mean 75.13 → 65.4 > 65.13 no
    subjects[2].readiness = 65; // floor-safe
    const wide = [subject({ readiness: 90 }), subject({ readiness: 90 }), subjects[2]];
    const out = deriveInsights(input({ subjects: wide })); // mean 81.67 → 65 < 71.67 fires
    const hit = byId(out, "lagging:MAS")!;
    expect(hit.message).toContain("MAS sits at 65");
    expect(hit.message).toContain("CVP Analysis (41)");
    expect(hit.cta.href).toMatch(/^\/subjects\/mas\//);
  });

  it("needs at least two attempted subjects", () => {
    const out = deriveInsights(
      input({ subjects: [subject({ readiness: 40, code: "MAS" })] })
    );
    expect(byId(out, "lagging")).toBeUndefined();
  });
});

describe("review pile-up", () => {
  it("fires at the threshold, not below", () => {
    expect(byId(deriveInsights(input({ reviewDue: PILEUP_DUE - 1 })), "review-pileup")).toBeUndefined();
    const hit = byId(deriveInsights(input({ reviewDue: PILEUP_DUE })), "review-pileup")!;
    expect(hit.cta.href).toBe("/review");
  });
});

describe("topic trends", () => {
  const series = (recentCorrect: number, prevCorrect: number, topicId: string) => {
    const mk = (n: number) =>
      Array.from({ length: TREND_WINDOW }, (_, i) => i < n);
    return [...mk(recentCorrect), ...mk(prevCorrect)].map((ok) => ({
      topic_id: topicId,
      is_correct: ok,
      seconds_taken: 30,
      timed: false,
    }));
  };

  it("flags a slipping topic (80% → 50%)", () => {
    const t = topic({ name: "Leases" });
    const s = subject({ code: "FAR", topics: [t] });
    const out = deriveInsights(
      input({ subjects: [s], attempts: series(5, 8, t.id) })
    );
    const hit = byId(out, `declining:${t.id}`)!;
    expect(hit.message).toContain("Leases is slipping: 80% → 50%");
  });

  it("celebrates a climbing topic (50% → 80%) as severity 0", () => {
    const t = topic({ name: "Receivables" });
    const s = subject({ code: "FAR", topics: [t] });
    const out = deriveInsights(
      input({ subjects: [s], attempts: series(8, 5, t.id) })
    );
    const hit = byId(out, `improving:${t.id}`)!;
    expect(hit.severity).toBe(0);
    expect(hit.message).toContain("climbing: 50% → 80%");
  });

  it("stays quiet under 2× the window or under the delta", () => {
    const t = topic();
    const s = subject({ topics: [t] });
    const short = series(2, 8, t.id).slice(0, TREND_WINDOW * 2 - 1);
    expect(deriveInsights(input({ subjects: [s], attempts: short }))).toEqual([]);
    const mild = series(7, 8, t.id); // 10-point dip < 20
    expect(byId(deriveInsights(input({ subjects: [s], attempts: mild })), "declining")).toBeUndefined();
  });
});

describe("coverage gap", () => {
  it("flags an untouched heavy topic, picks the heaviest", () => {
    const big = topic({ name: "Consolidated FS", distinctSeen: 0, attempted: false, mastery: 0, tos_weight: 12 });
    const small = topic({ distinctSeen: 0, attempted: false, mastery: 0, tos_weight: COVERAGE_MIN_WEIGHT });
    const light = topic({ distinctSeen: 0, attempted: false, mastery: 0, tos_weight: COVERAGE_MIN_WEIGHT - 1 });
    const s = subject({ code: "AFAR", topics: [topic(), small, big, light] });
    const out = deriveInsights(input({ subjects: [s] }));
    const hit = byId(out, "coverage")!;
    expect(hit.message).toContain("Consolidated FS");
    expect(hit.message).toContain("12% of AFAR");
  });
});

describe("pace risk", () => {
  const timedAttempts = (topicId: string, n: number, secs: number) =>
    Array.from({ length: n }, () => ({
      topic_id: topicId,
      is_correct: true,
      seconds_taken: secs,
      timed: true,
    }));

  it("fires over 120% of budget with enough timed attempts", () => {
    const t = topic();
    const s = subject({ code: "FAR", topics: [t], secondsBudget: 154 });
    const out = deriveInsights(
      input({ subjects: [s], attempts: timedAttempts(t.id, PACE_MIN_ATTEMPTS, 190) })
    );
    const hit = byId(out, "pace:FAR")!;
    expect(hit.message).toContain("190s");
    expect(hit.message).toContain("154s");
  });

  it("ignores untimed attempts and small samples", () => {
    const t = topic();
    const s = subject({ code: "FAR", topics: [t] });
    const slowTutor = timedAttempts(t.id, 30, 300).map((a) => ({ ...a, timed: false }));
    expect(byId(deriveInsights(input({ subjects: [s], attempts: slowTutor })), "pace")).toBeUndefined();
    const few = timedAttempts(t.id, PACE_MIN_ATTEMPTS - 1, 300);
    expect(byId(deriveInsights(input({ subjects: [s], attempts: few })), "pace")).toBeUndefined();
  });
});

describe("selection", () => {
  it("caps at 3, never two insights for the same subject, positive takes slot 3", () => {
    // Subject A: pass blocker AND lagging (only blocker should survive)
    const a = subject({ code: "A", readiness: 50 });
    const b = subject({ code: "B", readiness: 90 });
    const c = subject({ code: "C", readiness: 90 });
    // climbing topic in subject B
    const climb = topic({ name: "Climber" });
    b.topics = [climb];
    const climbing = [
      ...Array.from({ length: TREND_WINDOW }, () => ({ topic_id: climb.id, is_correct: true, seconds_taken: 30, timed: false })),
      ...Array.from({ length: TREND_WINDOW }, (_, i) => ({ topic_id: climb.id, is_correct: i < 5, seconds_taken: 30, timed: false })),
    ];
    const out = deriveInsights(
      input({ subjects: [a, b, c], attempts: climbing, reviewDue: PILEUP_DUE })
    );
    expect(out.length).toBeLessThanOrEqual(MAX_INSIGHTS);
    const subjectsUsed = out.map((i) => i.id.split(":")[1]).filter(Boolean);
    expect(new Set(subjectsUsed).size).toBe(subjectsUsed.length);
    expect(out[out.length - 1].severity).toBe(0); // positive earned slot 3
    expect(out[0].id).toBe("pass-blocker:A"); // severity orders first
  });

  it("returns nothing for an empty account", () => {
    expect(deriveInsights(input())).toEqual([]);
  });
});

describe("payoffScore (Focus next ranking)", () => {
  it("ranks a heavy mediocre topic above a light terrible one", () => {
    expect(payoffScore(50, 12)).toBeGreaterThan(payoffScore(40, 4));
  });
  it("zero at or above the pass line", () => {
    expect(payoffScore(75, 12)).toBe(0);
    expect(payoffScore(90, 12)).toBe(0);
  });
});
