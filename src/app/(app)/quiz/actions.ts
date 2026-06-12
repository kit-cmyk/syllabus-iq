"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeMastery, subjectReadiness } from "@/lib/mastery";
import { applyReviewAnswer, enrolledState } from "@/lib/review";
import { manilaToday, addDays } from "@/lib/dates";
import type { QuizMode } from "@/lib/types";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export type CreateSessionInput = {
  subjectId: string;
  topicIds: string[];
  count: 10 | 20 | 30;
  mode: QuizMode;
};

/**
 * Builds a practice session. Question order: never-attempted first (shuffled),
 * then least-recently-seen (PLAN.md Phase 1).
 */
export async function createSession(
  input: CreateSessionInput
): Promise<{ error: string } | never> {
  const { supabase, user } = await getUserOrThrow();
  const { subjectId, topicIds, mode } = input;
  const count = [10, 20, 30].includes(input.count) ? input.count : 10;

  if (!topicIds.length) return { error: "Pick at least one topic." };

  const { data: topics } = await supabase
    .from("topics")
    .select("id")
    .eq("subject_id", subjectId)
    .in("id", topicIds);
  if (!topics || topics.length !== topicIds.length)
    return { error: "Those topics don't match the chosen subject." };

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .in("topic_id", topicIds)
    .eq("is_active", true);
  if (!questions?.length)
    return {
      error:
        "No questions in the bank for those topics yet. Try other topics while the bank grows.",
    };

  const { data: history } = await supabase
    .from("attempts")
    .select("question_id, created_at")
    .eq("user_id", user.id)
    .in(
      "question_id",
      questions.map((q) => q.id)
    )
    .order("created_at", { ascending: false });

  const lastSeen = new Map<string, string>();
  for (const a of history ?? []) {
    if (!lastSeen.has(a.question_id)) lastSeen.set(a.question_id, a.created_at);
  }

  const fresh = questions.filter((q) => !lastSeen.has(q.id));
  const seen = questions
    .filter((q) => lastSeen.has(q.id))
    .sort((a, b) => lastSeen.get(a.id)!.localeCompare(lastSeen.get(b.id)!));
  // Fisher–Yates on the never-seen pool
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const picked = [...fresh, ...seen].slice(0, count).map((q) => q.id);

  const { data: session, error } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      type: "practice",
      mode,
      subject_id: subjectId,
      topic_ids: topicIds,
      question_ids: picked,
      question_count: picked.length,
    })
    .select("id")
    .single();
  if (error || !session) return { error: "Could not start the quiz. Try again." };

  redirect(`/quiz/${session.id}`);
}

export type AnswerResult = {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  /** Present only in review sessions — what happened on the ladder. */
  review?: { cleared: boolean; dueInDays?: number; step?: number };
};

type Supa = Awaited<ReturnType<typeof createClient>>;

/** A miss outside a review session (re)enrolls the question, due tomorrow. */
async function enrollMiss(supabase: Supa, userId: string, questionId: string) {
  const { data: existing } = await supabase
    .from("review_items")
    .select("interval_step, miss_count")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();
  const next = enrolledState(existing ?? undefined);
  await supabase.from("review_items").upsert(
    {
      user_id: userId,
      question_id: questionId,
      interval_step: next.interval_step,
      miss_count: next.miss_count,
      due_at: addDays(manilaToday(), next.dueInDays),
      cleared: false,
    },
    { onConflict: "user_id,question_id" }
  );
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  chosenIndex: number,
  secondsTaken: number
): Promise<AnswerResult | { error: string }> {
  const { supabase, user } = await getUserOrThrow();

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id, type")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "This session is no longer active." };

  // Grading happens in the database (SECURITY DEFINER) — the answer key never
  // reaches a client-readable surface (migration 0006).
  const { data: graded, error: rpcError } = await supabase.rpc("submit_attempt", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_chosen_index: chosenIndex,
    p_seconds: Math.round(secondsTaken),
  });
  if (rpcError) return { error: "Could not save — check your connection." };
  if (graded?.error) return { error: graded.error as string };

  const isCorrect = graded.isCorrect as boolean;

  // Review-queue bookkeeping (PLAN.md Phase 5)
  let review: AnswerResult["review"];
  if (session.type === "practice" && !isCorrect) {
    await enrollMiss(supabase, user.id, questionId);
  } else if (session.type === "review") {
    const { data: item } = await supabase
      .from("review_items")
      .select("interval_step, miss_count, cleared")
      .eq("user_id", user.id)
      .eq("question_id", questionId)
      .maybeSingle();
    if (item && !item.cleared) {
      const outcome = applyReviewAnswer(item, isCorrect);
      if (outcome.cleared) {
        await supabase
          .from("review_items")
          .update({ cleared: true })
          .eq("user_id", user.id)
          .eq("question_id", questionId);
        review = { cleared: true };
      } else {
        await supabase
          .from("review_items")
          .update({
            interval_step: outcome.interval_step,
            miss_count: outcome.miss_count,
            due_at: addDays(manilaToday(), outcome.dueInDays),
          })
          .eq("user_id", user.id)
          .eq("question_id", questionId);
        review = {
          cleared: false,
          dueInDays: outcome.dueInDays,
          step: outcome.interval_step,
        };
      }
    } else if (!isCorrect) {
      // a missed refresher enters the queue like any other miss
      await enrollMiss(supabase, user.id, questionId);
      review = { cleared: false, dueInDays: 1, step: 0 };
    }
  }

  return {
    isCorrect,
    correctIndex: graded.correctIndex as number,
    explanation: graded.explanation as string,
    review,
  };
}

/**
 * Finalizes a session: scores it (blanks = wrong), recomputes mastery for every
 * touched topic, writes the once-a-day readiness snapshot, then redirects to
 * the summary (PLAN.md Phases 2–3).
 */
export async function completeSession(sessionId: string): Promise<never | { error: string }> {
  const { supabase, user } = await getUserOrThrow();

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "Session not found." };

  if (!session.completed_at) {
    const { data: attempts } = await supabase
      .from("attempts")
      .select("question_id, topic_id, is_correct")
      .eq("session_id", sessionId);

    const correct = (attempts ?? []).filter((a) => a.is_correct).length;
    const scorePct = (correct / session.question_count) * 100;

    await supabase
      .from("quiz_sessions")
      .update({ completed_at: new Date().toISOString(), score_pct: scorePct })
      .eq("id", sessionId);

    // Recompute mastery for each topic touched in this session
    const touched = [...new Set((attempts ?? []).map((a) => a.topic_id))];
    for (const topicId of touched) {
      const { data: topicAttempts } = await supabase
        .from("attempts")
        .select("question_id, is_correct")
        .eq("user_id", user.id)
        .eq("topic_id", topicId)
        .order("created_at", { ascending: false })
        .limit(500);
      const m = computeMastery(topicAttempts ?? []);
      await supabase.from("topic_mastery").upsert({
        user_id: user.id,
        topic_id: topicId,
        score: m.score,
        distinct_seen: m.distinctSeen,
        last_attempt_at: new Date().toISOString(),
      });
    }

    // Mock answers stay editable until submission, so misses enroll here, not per answer.
    if (session.type === "mock") {
      for (const a of (attempts ?? []).filter((a) => !a.is_correct)) {
        await enrollMiss(supabase, user.id, a.question_id);
      }
    }

    await writeDailySnapshot(supabase, user.id);
  }

  redirect(`/quiz/${sessionId}/summary`);
}

async function writeDailySnapshot(supabase: Supa, userId: string) {
  const [{ data: subjects }, { data: topics }, { data: mastery }] =
    await Promise.all([
      supabase.from("subjects").select("id, code"),
      supabase.from("topics").select("id, subject_id, tos_weight"),
      supabase.from("topic_mastery").select("topic_id, score").eq("user_id", userId),
    ]);
  const scoreByTopic = new Map((mastery ?? []).map((m) => [m.topic_id, m.score]));
  const perSubject: Record<string, number> = {};
  for (const s of subjects ?? []) {
    const ts = (topics ?? [])
      .filter((t) => t.subject_id === s.id)
      .map((t) => ({
        tos_weight: Number(t.tos_weight),
        mastery: scoreByTopic.get(t.id) ?? 0,
      }));
    perSubject[s.code] = Math.round(subjectReadiness(ts) * 10) / 10;
  }
  const values = Object.values(perSubject);
  const overall = values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : 0;

  // First completion of the day wins; later sessions don't churn the trend line.
  await supabase.from("readiness_snapshots").upsert(
    { user_id: userId, day: manilaToday(), overall, subjects: perSubject },
    { onConflict: "user_id,day", ignoreDuplicates: true }
  );
}
