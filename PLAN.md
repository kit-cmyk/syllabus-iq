# SyllabusIQ — Feature Set & Implementation Plan

**Product:** Mastery tracking and self-testing web app for CPALE (Philippine CPA Licensure Exam) reviewers.
**Core promise:** "Know exactly where you stand on every syllabus topic, and always know what to study next."

---

## 1. Who it's for and what it must do

A CPALE reviewee preparing for the 6-subject board exam:

| Code | Subject | Exam items | Time |
|------|---------|-----------|------|
| FAR  | Financial Accounting & Reporting | 70 MCQs | 3 hrs |
| AFAR | Advanced Financial Accounting & Reporting | 70 MCQs | 3 hrs |
| MAS  | Management Advisory Services | 70 MCQs | 3 hrs |
| AUD  | Auditing | 70 MCQs | 3 hrs |
| TAX  | Taxation | 70 MCQs | 3 hrs |
| RFBT | Regulatory Framework for Business Transactions | 100 MCQs | 3 hrs |

**Pass rule (RA 9298):** general average ≥ 75% with no subject below 65%. Conditional status if ≥ 75% in a majority of subjects. The app's readiness logic mirrors this exactly.

The four jobs the user hired the app for (from the brief):
1. **Test knowledge** → practice quizzes + mock exams
2. **Track mastery per topic** → topic-level mastery scores
3. **Track progress** → dashboard with trends and readiness
4. **See improvement sections** → weakest-topics surfacing + review queue

Everything below serves one of these four. Nothing else ships in v1.

### Deliberately out of scope for launch
Payments/subscriptions, gamification, leaderboards/social, native mobile apps, AI question generation, content marketplace, offline mode, admin CMS UI (content loads via import script). Add later only if launch proves demand.

---

## 2. Domain model

```
Subject (6, fixed)
  └── Topic (from the official PRC Table of Specifications, ~8–15 per subject)
        └── Question (MCQ, 4 choices, 1 correct, explanation, difficulty 1–3)

User
  └── Attempt (user × question × answer × correct? × timestamp × session)
  └── QuizSession (config, score, type: practice | mock)
  └── TopicMastery (derived/cached: score, band, last_practiced)
  └── ReviewItem (missed question + next due date)
```

Each topic also carries **study materials** (readings in markdown, embedded videos) — the Subjects tab is the study hub: read → watch → practice per topic. Materials load via `scripts/import-materials.mjs`, same pipeline pattern as questions.

Topics come from each subject's published Table of Specifications (TOS), each with its official **weight** (% of exam items). Weights drive mock-exam sampling and readiness math. The taxonomy is seed data, not hardcoded — when PRC revises the syllabus, you update a seed file, not code.

**Content is the critical path.** The app is worthless without a tagged question bank. Minimum viable bank: **~40 questions per topic** for one subject (start with FAR — highest perceived difficulty, first thing reviewees study). Question authoring/sourcing must run in parallel with Phases 0–1. Questions load via CSV import script (no CMS needed for launch).

---

## 3. Mastery logic (the core of the product)

One number per topic, 0–100, that is **explainable** — a reviewee must be able to see why their score is what it is, or they won't trust it.

### Topic mastery score

For a user's attempts on a topic, ordered most-recent-first (attempt 0 = latest):

```
weightedAccuracy = Σ (correctᵢ × 0.9ⁱ) / Σ (0.9ⁱ)        // recent attempts dominate;
                                                          // last ~20 attempts carry ~88% of weight
coverage         = min(distinctQuestionsSeen / 15, 1)     // can't claim mastery off 3 questions
mastery          = round(weightedAccuracy × coverage × 100)
```

Why this design:
- **Recency weighting (0.9 decay):** improvement shows up fast; old mistakes stop haunting the score. A reviewee who went 4/10 last month but 9/10 this week sees ~85, not 65. This is what makes the app feel like it "notices" improvement.
- **Coverage factor:** prevents false confidence — 3/3 correct shows 20, not 100, until they've seen ≥15 distinct questions in the topic.
- **No silent time decay.** Scores never drop while the user is away (that reads as a bug and destroys trust). Instead, a topic untouched for **14+ days** gets a visible **"stale"** badge and rises in the review queue (Phase 5).

### Mastery bands

| Band | Score | Meaning shown to user |
|------|-------|----------------------|
| Not started | no attempts | — |
| Learning | < 60 | "Focus here" |
| Developing | 60–74 | "Below pass line" |
| Proficient | 75–84 | "Passing level" |
| Mastered | ≥ 85 | "Exam ready" |

The 75 boundary deliberately matches the actual pass mark — the UI never has to explain what "good enough" means.

### Subject readiness & overall readiness

```
subjectReadiness = Σ (topicMastery × topicTOSWeight)            // untouched topics count as 0 — honest, motivating
overallReadiness = mean of 6 subjectReadiness scores
status           = PASS  if overall ≥ 75 and every subject ≥ 65
                 = CONDITIONAL if ≥ 4 subjects ≥ 75 and rest ≥ 65
                 = NOT YET otherwise
```

Computation: mastery is recomputed for the affected topics at the end of each quiz session (not per-answer, not nightly) and cached in `topic_mastery`. Cheap, always fresh, no background jobs.

---

## 4. Feature set, ordered by impact

| # | Feature | Job served | Why this order |
|---|---------|-----------|----------------|
| 0 | Foundation (auth, schema, syllabus seed, shell) | — | Everything depends on it; kept to 1 week |
| 1 | **Practice quizzes** + question bank import | Test knowledge | The product's engine; generates the attempt data every other feature consumes |
| 2 | **Topic mastery tracking** | Track mastery | The differentiator; turns quiz data into the core promise |
| 3 | **Progress dashboard** | Track progress + improvement sections | Makes mastery actionable: trends, weakest topics, "study this next" |
| 4 | **Mock exams** | Test knowledge (exam-realistic) | Full-format simulation with real pass-line scoring; needs a deep question bank, so it comes after content has grown |
| 5 | **Smart review queue** | Improvement sections | Closes the loop: missed questions and stale topics come back automatically |

Each phase ships one complete, usable feature. The app is launchable after Phase 3; Phases 4–5 make it sticky.

---

## 5. Stack (minimal, no extras)

- **Next.js 15** (App Router, TypeScript) on **Vercel** — one framework, server components for data-heavy pages, API routes for mutations.
- **Supabase** — Postgres, Auth (email/password + Google), Row Level Security. No separate backend.
- **Tailwind CSS** + one small chart library (**Recharts**) for the dashboard. No component framework beyond this.
- Charts appear in Phase 3 only; don't install until then.

That's the whole stack. No state library (server components + React state suffice), no ORM beyond `supabase-js`, no queue/cron (mastery computes synchronously per session).

### Database schema

```sql
subjects        (id, code, name, exam_item_count, exam_minutes, sort_order)
topics          (id, subject_id, name, tos_weight numeric, sort_order)
questions       (id, topic_id, stem text, choices jsonb /* [a,b,c,d] */,
                 correct_index int, explanation text, difficulty int, is_active bool)
quiz_sessions   (id, user_id, type 'practice'|'mock', subject_id, topic_ids uuid[],
                 question_count, started_at, completed_at, score_pct)
attempts        (id, user_id, session_id, question_id, topic_id,
                 chosen_index, is_correct, seconds_taken, created_at)
topic_mastery   (user_id, topic_id, score int, distinct_seen int,
                 last_attempt_at, PRIMARY KEY (user_id, topic_id))
review_items    (id, user_id, question_id, miss_count, interval_step int,
                 due_at, cleared bool)        -- Phase 5
```

RLS: users read/write only their own `quiz_sessions`, `attempts`, `topic_mastery`, `review_items`. `subjects/topics/questions` are read-only to authenticated users; writes happen via the import script using the service role key.

---

## 6. Development phases

### Phase 0 — Foundation *(~1 week)*

**Ships:** A deployed app you can sign into, with the full syllabus browsable.

- Next.js project, Tailwind, Supabase project, Vercel deploy pipeline.
- Auth: email/password + Google sign-in, protected routes.
- Schema above (minus `review_items`), RLS policies.
- **Syllabus seed:** all 6 subjects and their TOS topics with weights, from the official BOA Table of Specifications. This is research + data entry — do it carefully once.
- App shell: sidebar (Dashboard, Subjects, Practice), subject page listing topics (no scores yet).

**Checks before moving on:**
- [ ] New user can sign up, sign in, sign out on the deployed URL
- [ ] All 6 subjects render with correct topic lists; TOS weights per subject sum to 100%
- [ ] RLS verified: user A cannot select user B's rows (test with two accounts)

---

### Phase 1 — Practice quizzes + question bank *(~2 weeks)*

**Ships:** The complete quiz loop. A user can drill any topic and get instant feedback with explanations. This alone is a usable product.

**Logic:**
- Quiz setup: pick subject → topics (one, several, or all) → length (10/20/30) → mode:
  - **Tutor mode:** answer → immediately see correct/incorrect + explanation → next.
  - **Timed mode:** ~90 sec/question budget shown as countdown; feedback at the end.
- Question selection: random from the chosen topics, **least-recently-seen first** (prefer questions the user has never attempted, then oldest-attempted) so drills don't repeat.
- Every answer writes an `attempts` row (this is the data substrate for Phases 2–5 — get it right here).
- Session summary screen: score, per-topic breakdown, list of missed questions with explanations.
- Session resume: an unfinished session can be continued (state in DB, not memory).
- **Import script** (`scripts/import-questions.ts`): CSV → validated insert (topic exists, exactly 4 choices, correct_index 0–3, explanation non-empty). Rejects with row-level errors. This is the only content pipeline at launch.

**Key screens:** Quiz setup, question player (one question per screen, keyboard 1–4 + Enter), session summary.

**Checks:**
- [ ] Full loop on production: setup → 10 questions → summary, in both modes
- [ ] Attempts rows correct (chosen/correct/topic/session) — verify against a hand-scored session
- [ ] Refresh mid-quiz resumes at the same question with answers intact
- [ ] Import script loads the initial FAR bank (~40 questions/topic) with zero silent failures
- [ ] Mobile-width check: the player is fully usable on a phone (reviewees study on phones)

---

### Phase 2 — Topic mastery tracking *(~1 week)*

**Ships:** The mastery score, visible everywhere topics appear.

**Logic:**
- Implement the Section 3 formula as one pure, unit-tested function: `computeMastery(attempts[]) → {score, distinctSeen}`.
- On quiz completion, recompute mastery for each topic touched in the session; upsert `topic_mastery`.
- One-time backfill for any attempts recorded during Phase 1.
- Subject page becomes the **mastery map**: every topic with band color, score, distinct-questions-seen, last-practiced date, stale badge (>14 days). Tapping a topic → "Practice this topic" pre-filled quiz setup.
- Topic detail: last 10 attempts (right/wrong strip) so the score is self-explanatory.

**Checks:**
- [ ] Unit tests for the formula: empty history, all-correct short history (coverage caps it), improvement case (old wrong + recent right scores high), regression case
- [ ] Score on screen matches hand-computed value for a scripted session
- [ ] Coverage rule visible: 3/3 correct shows "Learning", not "Mastered"
- [ ] Completing a quiz updates the mastery map immediately, no reload

---

### Phase 3 — Progress dashboard & improvement sections *(~1.5 weeks)*

**Ships:** The home screen that answers "where am I, and what do I study next?" in five seconds. **The app is launchable at the end of this phase.**

**Logic & layout (top to bottom):**
1. **Readiness header:** overall readiness number + PASS / CONDITIONAL / NOT YET status per the Section 3 rules, with the 6 subject scores as a bar row (65 and 75 pass lines drawn in).
2. **Improvement sections:** the 5 weakest *attempted* topics (lowest mastery, ties → most stale), each with a one-tap "Practice now" → pre-filled 10-question quiz. Untouched topics listed separately as "Not started" so coverage gaps are visible rather than mixed into "weak".
3. **Trend chart:** overall readiness over time. Snapshot `(user_id, date, overall, per-subject jsonb)` written at most once per day, on the first session completion of that day — no cron.
4. **Activity strip:** questions answered this week vs last, current daily streak (computed from attempt timestamps, no extra tables).

**Checks:**
- [ ] Readiness math verified against a hand-built fixture (known masteries × TOS weights)
- [ ] Status logic: construct fixtures for PASS, CONDITIONAL (4 of 6 ≥75), and NOT YET (one subject at 64 blocks pass)
- [ ] "Practice now" lands in a quiz scoped to exactly that topic
- [ ] Dashboard loads fast (<1s) with a seeded 2,000-attempt account; add indexes on `attempts(user_id, topic_id, created_at)` if not
- [ ] Empty states designed: brand-new user sees a clear "take your first quiz" path, not zeros

---

### Phase 4 — Mock exams *(~1.5 weeks)*

**Ships:** Full-format exam simulation per subject, scored exactly like the board exam.

**Logic:**
- One mock = one subject, real format: 70 items (100 for RFBT), 3-hour countdown, **no feedback until submitted**.
- **TOS-weighted sampling:** items per topic = `round(tos_weight × item_count)`, remainder seats to highest-weight topics; within a topic, least-recently-seen first. A mock therefore mirrors the real exam's blueprint.
- Exam player: question palette (answered / flagged / blank), flag-for-review, free navigation. Auto-submit at 0:00. Blank = wrong, as in the real exam.
- Autosave every answer to the session (a dropped connection or closed tab must not destroy a 3-hour mock).
- Results: score vs the 75 pass line / 65 floor, per-topic breakdown feeding the same mastery pipeline (mock attempts are attempts), full review of every question with explanations, time-per-question vs the 154s budget.
- Dashboard readiness header gains "last mock score" per subject next to the mastery-based estimate — predicted vs actual.

**Content gate:** a subject needs ≥ 3× its item count in active questions (e.g., FAR ≥ 210) before its mock unlocks, so one mock doesn't exhaust the bank. Locked subjects show the count needed.

**Checks:**
- [ ] Sampling test: generated mock's per-topic counts match TOS weights (run 50 generations, assert distribution)
- [ ] Timer: auto-submit fires at 0:00; blanks scored wrong
- [ ] Kill the tab at question 40, reopen → all 40 answers and remaining time intact
- [ ] A completed mock updates topic mastery and the dashboard
- [ ] 100-item RFBT palette is navigable on a phone

---

### Phase 5 — Smart review queue *(~1 week)*

**Ships:** "Review" — a daily queue that resurfaces what the user got wrong, at spaced intervals.

**Logic:**
- Miss a question (practice or mock) → `review_items` row, due **tomorrow**.
- Simple spacing ladder, no SM-2 complexity: intervals **1 → 3 → 7 → 16 days**. Correct on review → next step (correct at step 4 → cleared). Wrong → back to step 1, `miss_count`+1.
- Review screen: "N due today" → quiz-player session of due items, tutor mode. Recording: each review answer is also a normal `attempts` row (mastery keeps benefiting).
- **Stale-topic refreshers:** if fewer than 10 items are due, top up with questions from stale topics (14+ days untouched), weakest first — the queue is never empty while the syllabus has gaps.
- Dashboard gets a "Review due: N" tile; sidebar badge with the count.

**Checks:**
- [ ] Ladder unit-tested: wrong→1d, right→3d→7d→16d→cleared, wrong-at-step-3→reset
- [ ] Same question missed twice in one day produces one review item, not two
- [ ] Due-today query is timezone-correct (Asia/Manila), tested at the midnight boundary
- [ ] Top-up draws only from stale/weak topics and never duplicates due items

---

## 7. Launch checklist (post-Phase 3, refine through 5)

- [ ] Question bank: FAR fully loaded (~40/topic), second subject in progress; bank growth schedule owned by a named person
- [ ] Every question has a non-empty explanation (the explanation *is* the teaching moment)
- [ ] 5 real reviewees complete signup → quiz → dashboard unaided; watch them, fix what confuses them
- [ ] Error monitoring (Vercel logs + Supabase logs reviewed weekly)
- [ ] Daily Postgres backups confirmed on (Supabase default — verify)
- [ ] Privacy note + terms page (you're storing student performance data)

## 8. Timeline summary

| Phase | Feature | Duration | Cumulative |
|-------|---------|----------|-----------|
| 0 | Foundation | 1 wk | 1 wk |
| 1 | Practice quizzes | 2 wks | 3 wks |
| 2 | Mastery tracking | 1 wk | 4 wks |
| 3 | Dashboard | 1.5 wks | 5.5 wks — **launchable** |
| 4 | Mock exams | 1.5 wks | 7 wks |
| 5 | Review queue | 1 wk | 8 wks |

Content authoring runs in parallel from week 1 and is the schedule risk — not the code.
