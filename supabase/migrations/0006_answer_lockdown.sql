-- Answer-key lockdown. Run after 0005_review.sql.
--
-- Problem: RLS allowed signed-in users to SELECT every column of questions,
-- so correct_index/explanation could be dumped via the REST API directly.
-- Fix: column-level grants hide the answer columns from clients; grading and
-- post-session review happen through SECURITY DEFINER functions that enforce
-- ownership and session state.

-- 1. Clients can read everything about a question EXCEPT the answer key.
revoke select on public.questions from authenticated;
grant select (id, topic_id, stem, choices, difficulty, is_active, created_at)
  on public.questions to authenticated;

-- 2. Grading: validates ownership + membership, records the attempt, and only
--    reveals the answer for tutor-style sessions (practice/review). Mock
--    answers stay editable and reveal nothing until submission.
create or replace function public.submit_attempt(
  p_session_id uuid,
  p_question_id uuid,
  p_chosen_index int,
  p_seconds int default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session quiz_sessions%rowtype;
  v_q questions%rowtype;
  v_is_correct boolean;
begin
  select * into v_session from quiz_sessions
    where id = p_session_id and user_id = auth.uid();
  if not found then
    return jsonb_build_object('error', 'Session not found.');
  end if;
  if v_session.completed_at is not null then
    return jsonb_build_object('error', 'This session is no longer active.');
  end if;
  if not (p_question_id = any(v_session.question_ids)) then
    return jsonb_build_object('error', 'That question isn''t part of this session.');
  end if;

  select * into v_q from questions where id = p_question_id and is_active;
  if not found then
    return jsonb_build_object('error', 'Question not found.');
  end if;

  v_is_correct := p_chosen_index = v_q.correct_index;

  insert into attempts
    (user_id, session_id, question_id, topic_id, chosen_index, is_correct, seconds_taken)
  values
    (auth.uid(), p_session_id, p_question_id, v_q.topic_id, p_chosen_index,
     v_is_correct, least(coalesce(p_seconds, 0), 3600))
  on conflict (session_id, question_id) do update
    set chosen_index = excluded.chosen_index,
        is_correct   = excluded.is_correct,
        seconds_taken = excluded.seconds_taken
    where v_session.type = 'mock'; -- only mocks may change answers

  if v_session.type = 'mock' then
    return jsonb_build_object('saved', true);
  end if;
  return jsonb_build_object(
    'isCorrect', v_is_correct,
    'correctIndex', v_q.correct_index,
    'explanation', v_q.explanation
  );
end $$;

-- 3. Post-session review: full question rows (answers included) only for the
--    owner of a COMPLETED session, scoped to that session's questions.
create or replace function public.session_review(p_session_id uuid)
returns table (id uuid, topic_id uuid, stem text, choices jsonb, correct_index int, explanation text)
language sql security definer set search_path = public stable as $$
  select q.id, q.topic_id, q.stem, q.choices, q.correct_index, q.explanation
  from questions q
  join quiz_sessions s on s.id = p_session_id
  where s.user_id = auth.uid()
    and s.completed_at is not null
    and q.id = any(s.question_ids);
$$;

revoke all on function public.submit_attempt(uuid, uuid, int, int) from public;
revoke all on function public.session_review(uuid) from public;
grant execute on function public.submit_attempt(uuid, uuid, int, int) to authenticated;
grant execute on function public.session_review(uuid) to authenticated;
