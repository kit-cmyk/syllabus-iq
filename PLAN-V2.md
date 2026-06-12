# SyllabusIQ V2 — Insights & Gamification Plan

Extends [PLAN.md](PLAN.md) (Phases 0–5, all shipped). Same rules: one complete
feature per phase, highest impact first, nothing that doesn't help retention or
pass rates. Two pillars:

1. **Insights** — the dashboard stops showing numbers and starts saying things:
   *"Your subjects average 74, but MAS sits at 58 — mostly CVP Analysis (41). Review it."*
2. **Gamification** — solo-motivation mechanics (XP, levels, daily goal, badges).
   No leaderboards, no social — a reviewee competes with the syllabus, not classmates.

Impact order: insights first (changes what users *do* next session), gamification
second (changes whether they *come back*), weekly recap last (nice, not vital).

---

## Phase 6 — Insight engine on the dashboard *(~1 week)*

**Ships:** Up to 3 plain-language insight cards under the readiness header, plus
a smarter "Focus next" ranked by exam payoff instead of raw weakness.

### The engine

One pure, unit-tested function — no new tables, no background jobs:

```
deriveInsights(input) → Insight[]      // src/lib/insights.ts
input  = { subjects[{code, readiness, attempted, topics[{name, mastery, tos_weight,
           stale, distinctSeen}]}], recentAttempts[{topic_id, is_correct, seconds, created_at}],
           reviewDueCount, lastMockBySubject }
Insight = { id, severity: 1..3, message, cta: {label, href} }
```

Rules, in severity order (thresholds are constants, tuned later):

| # | Rule | Trigger | Message shape | CTA |
|---|------|---------|--------------|-----|
| 1 | **Pass blocker** | any attempted subject < 65 floor | "TAX (61) is below the 65 floor — on exam day it would block everything else." | Practice weakest TAX topic |
| 2 | **Lagging subject** (the user's exact ask) | subject readiness < (mean of attempted subjects − 10) | "Your subjects average 74, but MAS sits at 58 — mostly **CVP Analysis (41)**. Review it." Driver topic = max (75 − mastery)⁺ × weight within that subject | Topic page (read → practice) |
| 3 | **Review pile-up** | due reviews ≥ 15 | "18 reviews due — clear them before they snowball; misses fade fast." | /review |
| 4 | **Declining topic** | last-10 accuracy ≤ previous-10 accuracy − 20pts (≥ 20 attempts on topic) | "Leases is slipping: 80% → 50% over your last ten answers." | Practice topic |
| 5 | **Coverage gap** | untouched topic with tos_weight ≥ 8% in an otherwise-started subject | "You've never touched **Consolidated FS** — it's 12% of AFAR." | Topic page |
| 6 | **Pace risk** | subject's recent timed/mock avg > 120% of its per-item budget | "You're averaging 190s per FAR item; exam budget is 154s." | Start timed practice |
| 7 | **Improving** (positive, max 1) | last-10 accuracy ≥ previous-10 + 20pts | "Receivables is climbing: 50% → 80%. It's working — lock it in." | Practice topic |

Selection: score = severity, tie-break by exam impact (weight × deficit); show
top 3; never two insights about the same subject; positive insight always
allowed in slot 3 if earned. Empty state (new user): no cards, dashboard
unchanged.

### Smarter "Focus next"

Replace pure lowest-mastery ordering with **payoff ranking**:
`impact = (75 − mastery)⁺ × tos_weight` — a 50-mastery topic worth 12% of the
exam outranks a 40-mastery topic worth 4%. Each row gains a small caption:
"12% of FAR · biggest payoff". Same component, new sort + caption.

### Checks
- [ ] Unit fixtures per rule: triggers exactly at threshold, not below; lagging-subject picks the correct driver topic by weight × deficit
- [ ] Cap and dedupe: 6 eligible insights → 3 shown, no subject twice, positive allowed in slot 3
- [ ] Payoff ranking: high-weight medium-weak topic outranks low-weight very-weak topic
- [ ] New-user and single-subject accounts render without insights and without errors
- [ ] Every message reads like a sentence a tutor would say (no raw numbers without context)

---

## Phase 7 — Gamification core *(~1.5 weeks)*

**Ships:** XP + levels, a daily goal ring, badges — all visible on the dashboard,
awarded server-side at the single choke point that already exists (`completeSession`).

### Logic

**XP** (awarded once, server-side, when a session completes):

| Action | XP |
|---|---|
| Question answered (any result) | 5 |
| Answered correctly | +5 |
| Review item cleared (step 4 passed) | 40 |
| Topic crosses into Proficient (≥75) | 100 |
| Topic crosses into Mastered (≥85) | 200 |
| Mock exam completed | 150 |
| Daily goal met (first time that day) | 50 |

Anti-farming guards: sessions < 5 questions earn no XP; a question answered in
the last hour earns no XP on re-answer; topic-crossing bonuses fire once per
direction (no bouncing 74↔75 for repeat XP — track `best_band` per topic).

**Levels:** cumulative XP thresholds `level n = 250 × n²` (L2 = 1,000 … L10 = 25,000).
CPA-journey titles, one per level: Freshman → Sophomore → Junior → Senior →
Graduate → Reviewee → Mock Topnotcher → Board Ready → Passer → **Topnotcher**.

**Daily goal:** default 20 questions/day, editable 10–100 in Settings. Computed
from attempts (Asia/Manila days) — no new writes. Dashboard shows a goal ring
(today's answered / goal). Streak stays activity-based (unchanged, already built);
the goal is a bonus layer, not a punishment.

**Badges** (~12 at launch; static catalog in code, awards in `user_badges`):
First Steps (first session) · Century (100 questions) · Marathon (1,000) ·
Week Streak (7) ·月 Month Streak (30) · First Mastery · Subject Secured (subject ≥75) ·
All Six Started · Mock Debut · Mock Passer (mock ≥75) · Queue Zero (cleared all due reviews) ·
Night Before (goal met 14 days straight).

### Schema (migration 0007)

```sql
user_stats   (user_id pk, xp int, level int, daily_goal int default 20,
              topic_best_band jsonb default '{}')   -- for one-time crossing bonuses
user_badges  (user_id, badge_id text, earned_at, pk(user_id, badge_id))
-- RLS: own-rows read; writes only via a SECURITY DEFINER award function called
-- from completeSession — clients can never grant themselves XP (same pattern as 0006).
```

### UI (DESIGN.md kit, right rail of dashboard)

- **Level card:** MasteryRing-style progress ring (XP into current level), big
  level numeral, title pill ("Reviewee"), `+120 XP today` caption.
- **Daily goal ring** beside the streak flame in the existing activity card.
- **Badge row:** last 3 earned as IconBubbles + "All badges" → modal grid
  (earned in color, locked in slate with how-to-earn captions).
- **Session summary** gains an XP line: "+85 XP · 7 day streak · 14/20 daily goal" —
  the reward moment lands where the work just happened.
- Quiz player and mastery logic untouched — gamification decorates, never distorts.

### Checks
- [ ] XP awarded exactly once per session (refresh/double-submit safe — keyed to session completion)
- [ ] Farming guards: 4-question session = 0 XP; re-answering within an hour = 0 XP; 74↔75 bounce pays the Proficient bonus once
- [ ] Level-up and badge awards appear on the session summary, not as interrupting popups
- [ ] Daily goal day boundary is Asia/Manila midnight (reuse `manilaDay`, already tested)
- [ ] A user who ignores gamification entirely loses zero existing functionality

---

## Phase 8 — Weekly recap *(~0.5 week, optional)*

**Ships:** A dashboard card that appears Mondays (or after 7+ days away):
last week vs the week before — questions answered, accuracy delta, readiness
delta, topics that moved bands, XP earned, badges won — closing with one line
from the insight engine ("This week: make MAS your project").
Computed on the fly from attempts + snapshots; no email, no cron, no schema.

**Checks:** correct week windows in Manila time; hidden for accounts < 14 days old;
renders from cached snapshots in one query round.

---

## Explicitly not doing
Leaderboards or any cross-user comparison (review anxiety is real; the exam is
the opponent) · XP purchases/streak freezes · push notifications/email ·
animated celebration overlays (a quiet pill beats confetti for a board reviewer) ·
ML-based insights (rules are explainable; the mastery engine stays the brain).

## Sequence & estimate

| Phase | Feature | Duration |
|---|---|---|
| 6 | Insight engine + payoff Focus-next | 1 wk |
| 7 | XP, levels, daily goal, badges | 1.5 wks |
| 8 | Weekly recap | 0.5 wk |

Phase 6 needs zero schema changes and lands the user-visible promise of this
plan ("tell me what's wrong and what to do"); Phase 7 adds the habit loop on a
locked-down schema; Phase 8 is polish. Content growth remains the parallel
track that gates everything else.
