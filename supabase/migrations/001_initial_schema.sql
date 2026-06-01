-- ============================================================
-- SyllabusIQ — Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- EXAM TEMPLATES
-- Stores any board exam as a JSON config tree.
-- Adding a new exam = INSERT one row, zero code changes.
-- ============================================================
create table if not exists public.exam_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  config      jsonb not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- Extended user data linked to auth.users.
-- Created automatically via trigger on signup.
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  avatar_url    text,
  streak_count  int not null default 0,
  streak_last_date date,
  streak_shields int not null default 0,
  total_xp      int not null default 0,
  created_at    timestamptz not null default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- USER EXAM ENROLLMENTS
-- One row per user per exam they are actively tracking.
-- ============================================================
create table if not exists public.user_exam_enrollments (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  template_id  uuid not null references public.exam_templates(id),
  exam_date    date not null,
  weekly_hours numeric(5,2) not null default 20,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- USER NODES
-- Per-topic progress state. Upserted on each coverage/mastery change.
-- node_path format: "SUBJECT_ID.DOMAIN_ID.TOPIC_ID"
-- ============================================================
create table if not exists public.user_nodes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  enrollment_id    uuid not null references public.user_exam_enrollments(id) on delete cascade,
  node_path        text not null,
  coverage_status  text not null default 'unread' check (coverage_status in ('unread','in_progress','completed')),
  mastery_score    numeric(5,2) not null default 0 check (mastery_score >= 0 and mastery_score <= 100),
  updated_at       timestamptz not null default now(),
  unique (user_id, enrollment_id, node_path)
);

-- ============================================================
-- SESSIONS
-- Immutable audit log of every study session.
-- ============================================================
create table if not exists public.sessions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  enrollment_id    uuid not null references public.user_exam_enrollments(id) on delete cascade,
  node_path        text not null,
  type             text not null check (type in ('passive','quiz')),
  duration_minutes int,
  score            numeric(5,2),
  total_items      int,
  logged_at        timestamptz not null default now()
);

-- ============================================================
-- GAMIFICATION: XP LOG
-- Immutable log of every XP-earning action.
-- ============================================================
create table if not exists public.user_xp_log (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action_type  text not null,
  xp_earned    int not null,
  logged_at    timestamptz not null default now()
);

-- ============================================================
-- GAMIFICATION: ACHIEVEMENTS
-- ============================================================
create table if not exists public.user_achievements (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  achievement_slug text not null,
  unlocked_at      timestamptz not null default now(),
  unique (user_id, achievement_slug)
);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  notify_daily_reminder    boolean not null default true,
  notify_pace_warning      boolean not null default true,
  notify_streak_milestone  boolean not null default true,
  reminder_time  time default '20:00:00',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only read/write their own rows.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_exam_enrollments enable row level security;
alter table public.user_nodes enable row level security;
alter table public.sessions enable row level security;
alter table public.user_xp_log enable row level security;
alter table public.user_achievements enable row level security;
alter table public.push_subscriptions enable row level security;

-- exam_templates is public read (anyone can see exam structures)
alter table public.exam_templates enable row level security;
create policy "exam_templates_public_read" on public.exam_templates for select using (true);

-- profiles: own row only
create policy "profiles_own" on public.profiles
  using (auth.uid() = id) with check (auth.uid() = id);

-- enrollments: own rows only
create policy "enrollments_own" on public.user_exam_enrollments
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_nodes: own rows only
create policy "user_nodes_own" on public.user_nodes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions: own rows only
create policy "sessions_own" on public.sessions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- xp_log: own rows only
create policy "xp_log_own" on public.user_xp_log
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements: own rows only
create policy "achievements_own" on public.user_achievements
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_subscriptions: own rows only
create policy "push_subs_own" on public.push_subscriptions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD VIEW (anonymous)
-- Shows aggregated mastery per enrollment for ranking.
-- opt_in_leaderboard defaults to false — users must opt in.
-- ============================================================
alter table public.profiles add column if not exists opt_in_leaderboard boolean not null default false;

create or replace view public.leaderboard as
select
  e.id as enrollment_id,
  e.template_id,
  round(avg(n.mastery_score), 1) as avg_mastery,
  count(n.id) as topics_logged,
  rank() over (partition by e.template_id order by avg(n.mastery_score) desc) as rank
from public.user_exam_enrollments e
join public.user_nodes n on n.enrollment_id = e.id
join public.profiles p on p.id = e.user_id
where p.opt_in_leaderboard = true
group by e.id, e.template_id;

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_user_nodes_lookup on public.user_nodes (user_id, enrollment_id);
create index if not exists idx_sessions_lookup on public.sessions (user_id, enrollment_id, logged_at desc);
create index if not exists idx_xp_log_user on public.user_xp_log (user_id, logged_at desc);
