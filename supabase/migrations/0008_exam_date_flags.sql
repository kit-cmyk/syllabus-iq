-- Exam-date pacing + question-quality flags. Run after 0007_gamification.sql.

-- 1. Target board-exam date (drives the countdown and pacing insights)
alter table public.user_stats add column if not exists exam_date date;

-- widen the client-writable columns to include exam_date (still never xp/level).
-- user_id must be in the UPDATE grant too: PostgREST upserts write the conflict
-- column into "on conflict do update set", so omitting it 42501s every upsert.
-- RLS (with check auth.uid() = user_id) still pins user_id to the caller's own id.
revoke insert, update on public.user_stats from authenticated;
grant insert (user_id, daily_goal, exam_date) on public.user_stats to authenticated;
grant update (user_id, daily_goal, exam_date) on public.user_stats to authenticated;

-- 2. Users flag bad questions; content QA reads this table (service role / dashboard)
create table if not exists public.question_flags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  reason      text not null check (reason in ('wrong-answer','unclear','typo')),
  created_at  timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.question_flags enable row level security;

-- create policy has no "if not exists"; drop-then-create keeps this re-runnable
drop policy if exists "own flags read"   on public.question_flags;
drop policy if exists "own flags insert" on public.question_flags;
create policy "own flags read"   on public.question_flags for select to authenticated using (auth.uid() = user_id);
create policy "own flags insert" on public.question_flags for insert to authenticated with check (auth.uid() = user_id);
