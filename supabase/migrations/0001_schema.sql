-- SyllabusIQ schema (PLAN.md §5)
-- Apply to your Supabase instance: paste into the SQL editor, or `supabase db push`.

create extension if not exists "pgcrypto";

create table public.subjects (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,          -- FAR, AFAR, MAS, AUD, TAX, RFBT
  name            text not null,
  exam_item_count int  not null,
  exam_minutes    int  not null default 180,
  sort_order      int  not null
);

create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name       text not null,
  tos_weight numeric(5,2) not null,              -- percent; weights per subject sum to 100
  sort_order int not null,
  unique (subject_id, name)
);

create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references public.topics(id) on delete cascade,
  stem          text not null,
  choices       jsonb not null,                  -- ["choice A","choice B","choice C","choice D"]
  correct_index int  not null check (correct_index between 0 and 3),
  explanation   text not null,
  difficulty    int  not null default 2 check (difficulty between 1 and 3),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint four_choices check (jsonb_array_length(choices) = 4)
);

create table public.quiz_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('practice','mock')),
  mode           text not null default 'tutor' check (mode in ('tutor','timed')),
  subject_id     uuid not null references public.subjects(id),
  topic_ids      uuid[] not null,
  question_ids   uuid[] not null,                -- ordered; the source of truth for resume
  question_count int not null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  score_pct      numeric(5,2)
);

create table public.attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references public.quiz_sessions(id) on delete cascade,
  question_id   uuid not null references public.questions(id),
  topic_id      uuid not null references public.topics(id),
  chosen_index  int  not null check (chosen_index between 0 and 3),
  is_correct    boolean not null,
  seconds_taken int,
  created_at    timestamptz not null default now(),
  unique (session_id, question_id)               -- one answer per question per session
);

create table public.topic_mastery (
  user_id         uuid not null references auth.users(id) on delete cascade,
  topic_id        uuid not null references public.topics(id) on delete cascade,
  score           int  not null check (score between 0 and 100),
  distinct_seen   int  not null default 0,
  last_attempt_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.readiness_snapshots (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  overall  numeric(5,2) not null,
  subjects jsonb not null,                       -- { "FAR": 71.5, ... }
  primary key (user_id, day)
);

-- Phase 5 (created now so the schema is complete; unused until the review feature ships)
create table public.review_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  miss_count    int  not null default 1,
  interval_step int  not null default 0,
  due_at        date not null,
  cleared       boolean not null default false,
  unique (user_id, question_id)
);

create index attempts_user_topic_idx   on public.attempts (user_id, topic_id, created_at desc);
create index attempts_user_question_idx on public.attempts (user_id, question_id, created_at desc);
create index attempts_session_idx      on public.attempts (session_id);
create index questions_topic_idx       on public.questions (topic_id) where is_active;
create index quiz_sessions_user_idx    on public.quiz_sessions (user_id, started_at desc);
