"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_SESSION_SIZE } from "@/lib/review";
import { STALE_DAYS } from "@/lib/mastery";
import { payoffScore } from "@/lib/insights";
import { manilaToday } from "@/lib/dates";

/**
 * "Study now" — one tap, zero decisions. Composes the optimal session:
 * every due review first, then questions from the highest-payoff topics
 * (pass-line deficit × TOS weight; untouched heavy topics rank highest),
 * least-recently-seen within each topic. Runs as a review-type session so
 * the spaced-repetition ladder applies to the due items.
 */
export async function createSmartSession(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: due }, { data: topics }, { data: mastery }] = await Promise.all([
    supabase
      .from("review_items")
      .select("question_id")
      .eq("user_id", user.id)
      .eq("cleared", false)
      .lte("due_at", manilaToday())
      .order("due_at", { ascending: true })
      .order("miss_count", { ascending: false })
      .limit(REVIEW_SESSION_SIZE),
    supabase.from("topics").select("id, tos_weight"),
    supabase.from("topic_mastery").select("topic_id, score").eq("user_id", user.id),
  ]);

  const dueIds = (due ?? []).map((d) => d.question_id);
  const refresherIds: string[] = [];

  if (dueIds.length < REVIEW_SESSION_SIZE) {
    const scoreByTopic = new Map((mastery ?? []).map((m) => [m.topic_id, m.score]));
    const ranked = (topics ?? [])
      .map((t) => ({
        id: t.id,
        payoff: payoffScore(scoreByTopic.get(t.id) ?? 0, Number(t.tos_weight)),
      }))
      .filter((t) => t.payoff > 0)
      .sort((a, b) => b.payoff - a.payoff)
      .slice(0, 8);

    if (ranked.length) {
      const { data: pool } = await supabase
        .from("questions")
        .select("id, topic_id")
        .in("topic_id", ranked.map((t) => t.id))
        .eq("is_active", true);
      const candidates = (pool ?? []).filter((q) => !dueIds.includes(q.id));

      const { data: history } = await supabase
        .from("attempts")
        .select("question_id, created_at")
        .eq("user_id", user.id)
        .in("question_id", candidates.map((q) => q.id))
        .order("created_at", { ascending: false });
      const lastSeen = new Map<string, string>();
      for (const a of history ?? []) {
        if (!lastSeen.has(a.question_id)) lastSeen.set(a.question_id, a.created_at);
      }

      // up to 3 per topic for variety, topics in payoff order, fresh questions first
      const need = REVIEW_SESSION_SIZE - dueIds.length;
      const byTopic = new Map<string, { id: string }[]>();
      for (const q of candidates) {
        const list = byTopic.get(q.topic_id) ?? [];
        list.push(q);
        byTopic.set(q.topic_id, list);
      }
      for (const t of ranked) {
        if (refresherIds.length >= need) break;
        const qs = (byTopic.get(t.id) ?? []).sort((a, b) => {
          const sa = lastSeen.get(a.id);
          const sb = lastSeen.get(b.id);
          if (!sa !== !sb) return sa ? 1 : -1;
          return (sa ?? "").localeCompare(sb ?? "");
        });
        for (const q of qs.slice(0, 3)) {
          if (refresherIds.length >= need) break;
          refresherIds.push(q.id);
        }
      }
    }
  }

  const picked = [...dueIds, ...refresherIds];
  if (!picked.length)
    return { error: "Nothing to study right now — the question bank may still be growing." };

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
  if (error || !session) return { error: "Could not start the session. Try again." };

  redirect(`/quiz/${session.id}`);
}

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
