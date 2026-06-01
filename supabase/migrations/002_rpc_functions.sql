-- ============================================================
-- RPC Functions for safe atomic updates
-- ============================================================

-- Increment profile total_xp atomically
create or replace function public.increment_profile_xp(p_user_id uuid, p_amount int)
returns void as $$
  update public.profiles
  set total_xp = total_xp + p_amount
  where id = p_user_id;
$$ language sql security definer;

-- Update streak atomically
create or replace function public.update_streak(p_user_id uuid)
returns int as $$
declare
  v_last_date date;
  v_streak int;
  v_today date := current_date;
begin
  select streak_last_date, streak_count
  into v_last_date, v_streak
  from public.profiles
  where id = p_user_id;

  if v_last_date is null or v_today - v_last_date > 2 then
    -- Reset streak (gap > 1 day) — check for shield first
    if v_today - v_last_date = 2 and v_streak > 0 then
      -- 1-day gap: use streak shield if available
      update public.profiles
      set streak_shields = greatest(0, streak_shields - 1),
          streak_last_date = v_today
      where id = p_user_id and streak_shields > 0;

      if found then
        return v_streak; -- Shield used, streak preserved
      end if;
    end if;

    update public.profiles
    set streak_count = 1,
        streak_last_date = v_today
    where id = p_user_id;
    return 1;

  elsif v_last_date = v_today then
    -- Already logged today
    return v_streak;

  else
    -- Consecutive day
    update public.profiles
    set streak_count = streak_count + 1,
        streak_last_date = v_today
    where id = p_user_id;
    return v_streak + 1;
  end if;
end;
$$ language plpgsql security definer;

-- Grant streak shield every 10-day milestone
create or replace function public.check_streak_shield(p_user_id uuid, p_streak int)
returns boolean as $$
begin
  if p_streak > 0 and p_streak % 10 = 0 then
    update public.profiles
    set streak_shields = streak_shields + 1
    where id = p_user_id;
    return true;
  end if;
  return false;
end;
$$ language plpgsql security definer;
