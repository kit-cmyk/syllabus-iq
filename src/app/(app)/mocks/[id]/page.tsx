import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MockPlayer } from "./player";

export default async function MockPage({
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
  if (!session || session.type !== "mock") notFound();
  if (session.completed_at) redirect(`/quiz/${id}/summary`);

  const [{ data: subject }, { data: questions }, { data: answered }] =
    await Promise.all([
      supabase
        .from("subjects")
        .select("code, exam_minutes")
        .eq("id", session.subject_id)
        .single(),
      // Sanitized: no correct_index, no explanation until submission
      supabase
        .from("questions")
        .select("id, stem, choices")
        .in("id", session.question_ids),
      supabase
        .from("attempts")
        .select("question_id, chosen_index")
        .eq("session_id", id),
    ]);

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const ordered = session.question_ids
    .map((qid: string) => byId.get(qid))
    .filter(Boolean) as NonNullable<typeof questions>;

  const deadline =
    new Date(session.started_at).getTime() +
    (subject?.exam_minutes ?? 180) * 60 * 1000;

  return (
    <MockPlayer
      sessionId={session.id}
      subjectCode={subject?.code ?? ""}
      questions={ordered}
      initialAnswers={Object.fromEntries(
        (answered ?? []).map((a) => [a.question_id, a.chosen_index])
      )}
      initialFlagged={session.flagged_ids ?? []}
      deadline={deadline}
    />
  );
}
