import { createClient } from "@/lib/supabase/server";
import {
  bandFor,
  isStale,
  subjectReadiness,
} from "@/lib/mastery";
import type { Band, Subject, Topic, TopicMastery } from "@/lib/types";

export type TopicWithMastery = Topic & {
  mastery: number;
  distinctSeen: number;
  band: Band;
  stale: boolean;
  lastAttemptAt: string | null;
};

export type SubjectOverview = Subject & {
  topics: TopicWithMastery[];
  readiness: number;
  attempted: boolean;
};

/** Full syllabus joined with the signed-in user's mastery — the app's main read. */
export async function getSyllabusOverview(userId: string): Promise<SubjectOverview[]> {
  const supabase = await createClient();
  const [{ data: subjects }, { data: topics }, { data: mastery }] =
    await Promise.all([
      supabase.from("subjects").select("*").order("sort_order"),
      supabase.from("topics").select("*").order("sort_order"),
      supabase.from("topic_mastery").select("*").eq("user_id", userId),
    ]);

  const masteryByTopic = new Map<string, TopicMastery>(
    (mastery ?? []).map((m) => [m.topic_id, m])
  );

  return (subjects ?? []).map((s) => {
    const subjectTopics: TopicWithMastery[] = (topics ?? [])
      .filter((t) => t.subject_id === s.id)
      .map((t) => {
        const m = masteryByTopic.get(t.id);
        return {
          ...t,
          tos_weight: Number(t.tos_weight),
          mastery: m?.score ?? 0,
          distinctSeen: m?.distinct_seen ?? 0,
          band: bandFor(m?.score ?? 0, !!m),
          stale: m ? isStale(m.last_attempt_at) : false,
          lastAttemptAt: m?.last_attempt_at ?? null,
        };
      });
    return {
      ...s,
      topics: subjectTopics,
      readiness: Math.round(
        subjectReadiness(
          subjectTopics.map((t) => ({ tos_weight: t.tos_weight, mastery: t.mastery }))
        )
      ),
      attempted: subjectTopics.some((t) => t.band !== "not-started"),
    };
  });
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
