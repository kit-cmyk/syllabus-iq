-- Phase 7 (gamification core) — PLAN-V2.md. Run after 0006_answer_lockdown.sql.
--
-- All XP/badge awarding happens in award_for_session(), a SECURITY DEFINER
-- function that derives every number from database state. Clients can call it
-- directly and gain nothing they haven't earned (same trust model as 0006).

create table public.user_stats (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  xp              int  not null default 0,
  level           int  not null default 1,
  daily_goal      int  not null default 20 check (daily_goal between 10 and 100),
  topic_best_band jsonb not null default '{}',  -- topic_id → 'proficient'|'mastered' (one-time crossing bonuses)
  last_goal_bonus date
);

create table public.user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.quiz_sessions add column if not exists xp_awarded boolean not null default false;
alter table public.review_items  add column if not exists cleared_at timestamptz;

alter table public.user_stats  enable row level security;
alter table public.user_badges enable row level security;

create policy "own stats read"  on public.user_stats  for select to authenticated using (auth.uid() = user_id);
create policy "own stats insert" on public.user_stats for insert to authenticated with check (auth.uid() = user_id);
create policy "own stats update" on public.user_stats  for update to authenticated using (auth.uid() = user_id);
create policy "own badges read" on public.user_badges for select to authenticated using (auth.uid() = user_id);

-- Clients may only touch daily_goal; xp/level/bands are function-only.
revoke insert, update on public.user_stats from authenticated;
grant insert (user_id, daily_goal) on public.user_stats to authenticated;
grant update (daily_goal)          on public.user_stats to authenticated;

create or replace function public.award_for_session(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s quiz_sessions%rowtype;
  v_stats user_stats%rowtype;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_xp int := 0;
  v_eligible int; v_correct int; v_cleared int;
  v_goal_bonus boolean := false;
  v_old_level int; v_new_level int;
  v_best jsonb;
  v_t record;
  v_prev text;
  v_total_attempts bigint;
  v_candidates text[] := '{}';
  v_new_badges text[] := '{}';
  v_badge text;
  v_inserted int;
begin
  select * into v_s from quiz_sessions where id = p_session_id and user_id = v_uid;
  if not found or v_s.completed_at is null then
    return jsonb_build_object('error', 'Session not finalized.');
  end if;

  -- claim first: re-calls (refresh, double-submit) award nothing
  update quiz_sessions set xp_awarded = true
    where id = p_session_id and not xp_awarded;
  if not found then
    return jsonb_build_object('xp_gained', 0, 'new_badges', '[]'::jsonb, 'leveled_up', false);
  end if;

  insert into user_stats (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_stats from user_stats where user_id = v_uid;

  -- base XP: 5 per answer +5 if correct; no XP for sessions under 5 questions,
  -- none for a question the user already answered in the previous hour
  if v_s.question_count >= 5 then
    select count(*), count(*) filter (where a.is_correct)
      into v_eligible, v_correct
      from attempts a
      where a.session_id = p_session_id
        and not exists (
          select 1 from attempts b
          where b.user_id = v_uid and b.question_id = a.question_id
            and b.created_at < a.created_at
            and b.created_at > a.created_at - interval '1 hour');
    v_xp := v_eligible * 5 + v_correct * 5;
  end if;

  if v_s.type = 'mock' then v_xp := v_xp + 150; end if;

  -- review items cleared during this session
  select count(*) into v_cleared from review_items
    where user_id = v_uid and cleared
      and cleared_at >= v_s.started_at and cleared_at <= v_s.completed_at + interval '5 minutes';
  v_xp := v_xp + v_cleared * 40;

  -- band-crossing bonuses, once per topic per band
  v_best := coalesce(v_stats.topic_best_band, '{}'::jsonb);
  for v_t in
    select tm.topic_id, tm.score from topic_mastery tm
      where tm.user_id = v_uid and tm.topic_id = any(v_s.topic_ids)
  loop
    v_prev := v_best ->> v_t.topic_id::text;
    if v_t.score >= 75 and v_prev is null then
      v_xp := v_xp + 100;
      v_best := jsonb_set(v_best, array[v_t.topic_id::text], '"proficient"');
      v_prev := 'proficient';
    end if;
    if v_t.score >= 85 and v_prev is distinct from 'mastered' then
      v_xp := v_xp + 200;
      v_best := jsonb_set(v_best, array[v_t.topic_id::text], '"mastered"');
    end if;
  end loop;

  -- daily goal bonus, once per Manila day
  if v_stats.last_goal_bonus is distinct from v_today
     and (select count(*) from attempts where user_id = v_uid
            and (created_at at time zone 'Asia/Manila')::date = v_today) >= v_stats.daily_goal then
    v_xp := v_xp + 50;
    v_goal_bonus := true;
  end if;

  v_old_level := v_stats.level;
  update user_stats set
      xp = xp + v_xp,
      level = least(10, greatest(1, floor(sqrt((xp + v_xp) / 250.0))::int)),
      topic_best_band = v_best,
      last_goal_bonus = case when v_goal_bonus then v_today else last_goal_bonus end
    where user_id = v_uid
    returning level into v_new_level;

  -- ----- badges (predicates over earned state only) -----
  select count(*) into v_total_attempts from attempts where user_id = v_uid;
  v_candidates := array_append(v_candidates, 'first-steps');
  if v_total_attempts >= 100  then v_candidates := array_append(v_candidates, 'century');  end if;
  if v_total_attempts >= 1000 then v_candidates := array_append(v_candidates, 'marathon'); end if;
  if (select count(distinct (created_at at time zone 'Asia/Manila')::date) from attempts
        where user_id = v_uid and (created_at at time zone 'Asia/Manila')::date >= v_today - 6) = 7
    then v_candidates := array_append(v_candidates, 'week-streak'); end if;
  if (select count(distinct (created_at at time zone 'Asia/Manila')::date) from attempts
        where user_id = v_uid and (created_at at time zone 'Asia/Manila')::date >= v_today - 29) = 30
    then v_candidates := array_append(v_candidates, 'month-streak'); end if;
  if exists (select 1 from topic_mastery where user_id = v_uid and score >= 85)
    then v_candidates := array_append(v_candidates, 'first-mastery'); end if;
  if exists (
      select 1 from subjects s
      where (select coalesce(sum(coalesce(tm.score, 0) * t.tos_weight), 0) / nullif(sum(t.tos_weight), 0)
               from topics t
               left join topic_mastery tm on tm.topic_id = t.id and tm.user_id = v_uid
               where t.subject_id = s.id) >= 75)
    then v_candidates := array_append(v_candidates, 'subject-secured'); end if;
  if (select count(distinct t.subject_id) from topic_mastery tm
        join topics t on t.id = tm.topic_id where tm.user_id = v_uid) >= 6
    then v_candidates := array_append(v_candidates, 'all-six-started'); end if;
  if exists (select 1 from quiz_sessions where user_id = v_uid and type = 'mock' and completed_at is not null)
    then v_candidates := array_append(v_candidates, 'mock-debut'); end if;
  if exists (select 1 from quiz_sessions where user_id = v_uid and type = 'mock'
               and completed_at is not null and score_pct >= 75)
    then v_candidates := array_append(v_candidates, 'mock-passer'); end if;
  if exists (select 1 from review_items where user_id = v_uid and cleared)
     and not exists (select 1 from review_items where user_id = v_uid
                       and not cleared and due_at <= v_today)
    then v_candidates := array_append(v_candidates, 'queue-zero'); end if;
  if (select count(*) from (
        select 1 from attempts where user_id = v_uid
          and (created_at at time zone 'Asia/Manila')::date >= v_today - 13
        group by (created_at at time zone 'Asia/Manila')::date
        having count(*) >= v_stats.daily_goal) x) = 14
    then v_candidates := array_append(v_candidates, 'goal-14'); end if;

  foreach v_badge in array v_candidates loop
    insert into user_badges (user_id, badge_id) values (v_uid, v_badge)
      on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then v_new_badges := array_append(v_new_badges, v_badge); end if;
  end loop;

  return jsonb_build_object(
    'xp_gained', v_xp,
    'total_xp', v_stats.xp + v_xp,
    'level', v_new_level,
    'leveled_up', v_new_level > v_old_level,
    'goal_bonus', v_goal_bonus,
    'new_badges', to_jsonb(v_new_badges)
  );
end $$;

revoke all on function public.award_for_session(uuid) from public;
grant execute on function public.award_for_session(uuid) to authenticated;
