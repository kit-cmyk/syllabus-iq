# SyllabusIQ

Mastery tracking and self-testing for CPALE reviewers. See [PLAN.md](PLAN.md) for the product plan and [DESIGN.md](DESIGN.md) for the design system.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · Tailwind v4 · Vitest

## Setup

1. **Supabase** — in your project's SQL editor, run in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_materials.sql` (study materials: readings + videos)
   - `supabase/migrations/0004_mock_flags.sql` (mock exams: flag-for-review state)
   - `supabase/migrations/0005_review.sql` (review queue: review sessions + refresher labels)
   - `supabase/migrations/0006_answer_lockdown.sql` (answer keys hidden from clients; grading via SECURITY DEFINER RPCs — **required**: answering questions breaks without it from this version on)
   - `supabase/seed/0001_syllabus.sql` (6 subjects, 69 TOS topics)
   - `supabase/seed/0002_sample_questions_far.sql` (26 starter FAR questions)
   - `supabase/seed/0003_sample_materials_far.sql` (3 starter FAR readings)
2. **Env** — `cp .env.local.example .env.local` and fill in the project URL + anon key (Settings → API). Add the service-role key only if you'll run the importer.
3. **Run** — `npm install && npm run dev`, then open http://localhost:3000.

Auth note: with Supabase's default "confirm email" setting on, new signups must click the emailed link (the app shows a check-your-email screen). Turn it off in Auth → Providers → Email for instant signups during development.

## The new-user journey (what's built)

Landing → Sign up → Dashboard (baseline empty state) → Practice setup (subject → topics → 10/20/30 → tutor/timed) → Question player (instant feedback + explanations, keyboard 1–4/Enter, mid-quiz refresh resumes) → Session results (score, per-topic breakdown, miss review) → Topic mastery map per subject → Dashboard readiness (PASS / CONDITIONAL / NOT YET vs the real 75/65 board rules, weakest topics, streak).

**Subjects is the study hub:** each topic opens a detail page with its reading materials (markdown) and videos (embedded YouTube/Vimeo), the student's mastery summary, and a one-tap quiz on that topic — read → watch → practice in one place.

**Mock exams (Phase 4):** full-format simulations per subject — real item counts (70, or 100 for RFBT), the 3-hour clock with auto-submit, TOS-weighted question sampling, flag-for-review, a question palette, autosaved answers (a closed tab resumes intact), and board-rules scoring against the 75 pass line / 65 floor. A subject's mock unlocks once its bank holds 3× the exam item count, so one mock can't exhaust the bank.

**Review queue (Phase 5):** every miss (practice or mock) enters the queue, due tomorrow, then returns at 1 → 3 → 7 → 16-day intervals — four straight correct reviews clears it; any miss resets it. Short days top up with refreshers from stale topics (untouched 14+ days, weakest first), so the queue is never empty while the syllabus has gaps. Due counts show in the sidebar badge and a dashboard tile; due dates are computed in Asia/Manila. All six PLAN.md phases are now built.

## Growing the question bank

```bash
node scripts/import-questions.mjs questions.csv
```

CSV header: `subject_code,topic,stem,choice_a,choice_b,choice_c,choice_d,correct,explanation,difficulty`
(`correct` is A–D; `topic` must match a seeded topic name exactly; every row is validated and nothing imports if any row fails).

Study materials use the same pattern:

```bash
node scripts/import-materials.mjs materials.csv
```

CSV header: `subject_code,topic,type,title,body,video_url,duration_minutes,sort_order` (`type` is `reading` — needs a markdown `body` — or `video` — needs a `video_url`).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — mastery-engine unit tests (`src/lib/mastery.test.ts`)
- `/styleguide` — the living component reference; every screen builds from this kit
