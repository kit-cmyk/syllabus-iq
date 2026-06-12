-- Phase 4 (mock exams): flag-for-review state must survive refresh/resume,
-- so it lives on the session row. Run after 0003_materials.sql.

alter table public.quiz_sessions
  add column if not exists flagged_ids uuid[] not null default '{}';
