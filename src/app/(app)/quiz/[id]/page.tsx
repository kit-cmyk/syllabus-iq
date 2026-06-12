import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SECONDS_PER_QUESTION } from "@/lib/mastery";
import { QuizPlayer } from "./player";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (!session) notFound();
  if (session.type === "mock") redirect(`/mocks/${id}`);
  if (session.completed_at) redirect(`/quiz/${id}/summary`);

  const [{ data: questions }, { data: topics }, { data: answered }] =
    await Promise.all([
      // Sanitized: correct_index and explanation never reach the player payload
      supabase
        .from("questions")
        .select("id, topic_id, stem, choices")
        .in("id", session.question_ids),
      supabase.from("topics").select("id, name").in("id", session.topic_ids),
      supabase
        .from("attempts")
        .select("question_id, chosen_index, is_correct")
        .eq("session_id", id),
    ]);

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const ordered = session.question_ids
    .map((qid: string) => byId.get(qid))
    .filter(Boolean) as NonNullable<typeof questions>;

  const deadline =
    session.mode === "timed"
      ? new Date(session.started_at).getTime() +
        session.question_count * SECONDS_PER_QUESTION * 1000
      : null;

  return (
    <QuizPlayer
      sessionId={session.id}
      mode={session.mode}
      questions={ordered}
      topicNames={Object.fromEntries((topics ?? []).map((t) => [t.id, t.name]))}
      initialAnswered={answered ?? []}
      deadline={deadline}
      refresherIds={session.refresher_ids ?? []}
    />
  );
}
