-- Row Level Security (PLAN.md §5): users touch only their own rows;
-- content tables are read-only to authenticated users (writes via service role / import script).

alter table public.subjects            enable row level security;
alter table public.topics              enable row level security;
alter table public.questions           enable row level security;
alter table public.quiz_sessions       enable row level security;
alter table public.attempts            enable row level security;
alter table public.topic_mastery       enable row level security;
alter table public.readiness_snapshots enable row level security;
alter table public.review_items        enable row level security;

-- Content: readable by any signed-in user, no client writes.
create policy "subjects readable"  on public.subjects  for select to authenticated using (true);
create policy "topics readable"    on public.topics    for select to authenticated using (true);
create policy "questions readable" on public.questions for select to authenticated using (is_active);

-- User-owned tables: full CRUD on own rows only.
create policy "own sessions" on public.quiz_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own attempts" on public.attempts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own mastery" on public.topic_mastery
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own snapshots" on public.readiness_snapshots
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own review items" on public.review_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
