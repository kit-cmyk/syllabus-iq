"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allocateMockItems, mockUnlockTarget } from "@/lib/mock";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Builds a full-format mock: TOS-weighted allocation per topic, least-recently-
 * seen questions within each topic, real exam length and time limit.
 */
export async function createMock(
  subjectId: string
): Promise<{ error: string } | never> {
  const { supabase, user } = await getUserOrThrow();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, code, exam_item_count, exam_minutes")
    .eq("id", subjectId)
    .single();
  if (!subject) return { error: "Subject not found." };

  const { data: topics } = await supabase
    .from("topics")
    .select("id, tos_weight")
    .eq("subject_id", subjectId);
  if (!topics?.length) return { error: "No topics for this subject." };

  const { data: questions } = await supabase
    .from("questions")
    .select("id, topic_id")
    .in(
      "topic_id",
      topics.map((t) => t.id)
    )
    .eq("is_active", true);

  const bank = questions ?? [];
  const target = mockUnlockTarget(subject.exam_item_count);
  if (bank.length < target) {
    return {
      error: `${subject.code} mocks unlock at ${target} bank questions (${bank.length} loaded). One mock shouldn't exhaust the bank.`,
    };
  }

  // least-recently-seen ordering inside each topic
  const { data: history } = await supabase
    .from("attempts")
    .select("question_id, created_at")
    .eq("user_id", user.id)
    .in(
      "question_id",
      bank.map((q) => q.id)
    )
    .order("created_at", { ascending: false });
  const lastSeen = new Map<string, string>();
  for (const a of history ?? []) {
    if (!lastSeen.has(a.question_id)) lastSeen.set(a.question_id, a.created_at);
  }

  const byTopic = new Map<string, { id: string }[]>();
  for (const q of bank) {
    const list = byTopic.get(q.topic_id) ?? [];
    list.push(q);
    byTopic.set(q.topic_id, list);
  }

  const allocation = allocateMockItems(
    topics.map((t) => ({
      id: t.id,
      tos_weight: Number(t.tos_weight),
      available: byTopic.get(t.id)?.length ?? 0,
    })),
    subject.exam_item_count
  );

  const picked: string[] = [];
  for (const [topicId, n] of allocation) {
    const pool = byTopic.get(topicId) ?? [];
    const fresh = pool.filter((q) => !lastSeen.has(q.id));
    for (let i = fresh.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
    }
    const seen = pool
      .filter((q) => lastSeen.has(q.id))
      .sort((a, b) => lastSeen.get(a.id)!.localeCompare(lastSeen.get(b.id)!));
    picked.push(...[...fresh, ...seen].slice(0, n).map((q) => q.id));
  }
  // interleave topics the way the real exam does: shuffle the final paper
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  const { data: session, error } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      type: "mock",
      mode: "timed",
      subject_id: subjectId,
      topic_ids: topics.map((t) => t.id),
      question_ids: picked,
      question_count: picked.length,
    })
    .select("id")
    .single();
  if (error || !session) return { error: "Could not start the mock. Try again." };

  redirect(`/mocks/${session.id}`);
}

/**
 * Autosaves an answer WITHOUT revealing correctness — nothing leaks until
 * submission. Answers stay changeable until the mock is completed.
 */
export async function saveMockAnswer(
  sessionId: string,
  questionId: string,
  chosenIndex: number
): Promise<{ saved: true } | { error: string }> {
  const { supabase } = await getUserOrThrow();

  // Graded inside the database (migration 0006); for mock sessions the RPC
  // saves silently and reveals nothing until submission.
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_chosen_index: chosenIndex,
    p_seconds: null,
  });
  if (error) return { error: "Could not save — check your connection." };
  if (data?.error) return { error: data.error as string };
  return { saved: true };
}

export async function setFlag(
  sessionId: string,
  questionId: string,
  flagged: boolean
): Promise<{ flagged_ids: string[] } | { error: string }> {
  const { supabase } = await getUserOrThrow();

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id, flagged_ids, completed_at")
    .eq("id", sessionId)
    .single();
  if (!session || session.completed_at)
    return { error: "This mock is no longer active." };

  const set = new Set<string>(session.flagged_ids ?? []);
  if (flagged) set.add(questionId);
  else set.delete(questionId);
  const flagged_ids = [...set];

  const { error } = await supabase
    .from("quiz_sessions")
    .update({ flagged_ids })
    .eq("id", sessionId);
  if (error) return { error: "Could not save the flag." };
  return { flagged_ids };
}
