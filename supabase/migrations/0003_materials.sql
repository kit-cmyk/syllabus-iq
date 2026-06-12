-- Study materials per topic: readings (markdown) and videos (embedded).
-- The Subjects tab is where students review, read through, and watch these.
-- Run after 0002_rls.sql.

create table public.materials (
  id               uuid primary key default gen_random_uuid(),
  topic_id         uuid not null references public.topics(id) on delete cascade,
  type             text not null check (type in ('reading','video')),
  title            text not null,
  body             text,        -- markdown; required for readings
  video_url        text,        -- YouTube/Vimeo URL; required for videos
  duration_minutes int,
  sort_order       int not null default 1,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint reading_has_body check (type <> 'reading' or body is not null),
  constraint video_has_url    check (type <> 'video' or video_url is not null)
);

create index materials_topic_idx on public.materials (topic_id, sort_order) where is_active;

alter table public.materials enable row level security;

-- Content model matches questions: readable when signed in, writes via service role only.
create policy "materials readable" on public.materials
  for select to authenticated using (is_active);
