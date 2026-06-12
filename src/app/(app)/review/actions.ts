"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_SESSION_SIZE } from "@/lib/review";
import { STALE_DAYS } from "@/lib/mastery";
import { manilaToday } from "@/lib/dates";

/**
 * Builds today's review session: every due item (most overdue, most-missed
 * first), topped up to REVIEW_SESSION_SIZE with refreshers from stale topics
 * (weakest first) when the due list is short. Never empty while the syllabus
 * has gaps.
 */
export async function createReviewSession(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: due } = await supabase
    .from("review_items")
    .select("question_id, due_at, miss_count")
    .eq("user_id", user.id)
    .eq("cleared", false)
    .lte("due_at", manilaToday())
    .order("due_at", { ascending: true })
    .order("miss_count", { ascending: false })
    .limit(30);

  const dueIds = (due ?? []).map((d) => d.question_id);
  const refresherIds: string[] = [];

  if (dueIds.length < REVIEW_SESSION_SIZE) {
    const staleCutoff = new Date(
      Date.now() - STALE_DAYS * 86400_000
    ).toISOString();
    const { data: staleTopics } = await supabase
      .from("topic_mastery")
      .select("topic_id, score")
      .eq("user_id", user.id)
      .lt("last_attempt_at", staleCutoff)
      .order("score", { ascending: true })
      .limit(10);

    if (staleTopics?.length) {
      const { data: pool } = await supabase
        .from("questions")
        .select("id, topic_id")
        .in(
          "topic_id",
          staleTopics.map((t) => t.topic_id)
        )
        .eq("is_active", true);

      // least-recently-seen within the stale pool, never duplicating due items
      const candidates = (pool ?? []).filter((q) => !dueIds.includes(q.id));
      const { data: history } = await supabase
        .from("attempts")
        .select("question_id, created_at")
        .eq("user_id", user.id)
        .in(
          "question_id",
          candidates.map((q) => q.id)
        )
        .order("created_at", { ascending: false });
      const lastSeen = new Map<string, string>();
      for (const a of history ?? []) {
        if (!lastSeen.has(a.question_id)) lastSeen.set(a.question_id, a.created_at);
      }
      const rank = new Map(staleTopics.map((t, i) => [t.topic_id, i]));
      candidates.sort((a, b) => {
        const seenA = lastSeen.get(a.id);
        const seenB = lastSeen.get(b.id);
        if (!seenA !== !seenB) return seenA ? 1 : -1; // never-seen first
        if (seenA && seenB && seenA !== seenB) return seenA.localeCompare(seenB);
        return (rank.get(a.topic_id) ?? 99) - (rank.get(b.topic_id) ?? 99); // weakest topic first
      });
      refresherIds.push(
        ...candidates.slice(0, REVIEW_SESSION_SIZE - dueIds.length).map((q) => q.id)
      );
    }
  }

  const picked = [...dueIds, ...refresherIds];
  if (!picked.length)
    return { error: "Nothing to review — you're all clear for today." };

  const { data: topicRows } = await supabase
    .from("questions")
    .select("id, topic_id")
    .in("id", picked);
  const topicIds = [...new Set((topicRows ?? []).map((q) => q.topic_id))];

  const { data: session, error } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      type: "review",
      mode: "tutor",
      subject_id: null,
      topic_ids: topicIds,
      question_ids: picked,
      question_count: picked.length,
      refresher_ids: refresherIds,
    })
    .select("id")
    .single();
  if (error || !session)
    return { error: "Could not start the review. Try again." };

  redirect(`/quiz/${session.id}`);
}
