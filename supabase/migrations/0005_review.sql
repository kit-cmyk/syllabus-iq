-- Phase 5 (smart review queue). Run after 0004_mock_flags.sql.
--
-- 1. Review sessions are a first-class session type.
-- 2. A review session spans subjects, so subject_id becomes nullable.
-- 3. Refresher items (stale-topic top-ups) are labeled in the player, so the
--    session remembers which questions were refreshers vs due reviews.

alter table public.quiz_sessions drop constraint quiz_sessions_type_check;
alter table public.quiz_sessions
  add constraint quiz_sessions_type_check check (type in ('practice','mock','review'));

alter table public.quiz_sessions alter column subject_id drop not null;

alter table public.quiz_sessions
  add column if not exists refresher_ids uuid[] not null default '{}';

create index if not exists review_items_due_idx
  on public.review_items (user_id, due_at) where not cleared;
