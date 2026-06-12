import { notFound, redirect } from "next/navigation";
import { Check, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PASS_LINE, SUBJECT_FLOOR } from "@/lib/mastery";
import { secondsPerItem } from "@/lib/mock";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { StatBlock } from "@/components/ui/stat-block";
import { ButtonLink } from "@/components/ui/button";

const LETTERS = ["A", "B", "C", "D"];

export default async function SummaryPage({
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
  if (!session.completed_at) redirect(`/quiz/${id}`);

  const [{ data: attempts }, { data: questions }, { data: topics }, { data: subject }] =
    await Promise.all([
      supabase.from("attempts").select("*").eq("session_id", id),
      // answer key comes via the owner-only, completed-session RPC (migration 0006)
      supabase.rpc("session_review", { p_session_id: id }),
      supabase.from("topics").select("id, name").in("id", session.topic_ids),
      session.subject_id
        ? supabase
            .from("subjects")
            .select("code, exam_minutes, exam_item_count")
            .eq("id", session.subject_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const isMock = session.type === "mock";
  const isReview = session.type === "review";

  type ReviewQuestion = {
    id: string;
    topic_id: string;
    stem: string;
    choices: string[];
    correct_index: number;
    explanation: string;
  };
  const reviewQuestions = (questions ?? []) as ReviewQuestion[];

  const attemptByQ = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  const topicName = new Map((topics ?? []).map((t) => [t.id, t.name]));
  const correct = (attempts ?? []).filter((a) => a.is_correct).length;
  const wrongOrBlank = session.question_count - correct;
  const score = Math.round(Number(session.score_pct));
  const timed = (attempts ?? []).filter((a) => a.seconds_taken != null);
  const avgSeconds = timed.length
    ? Math.round(timed.reduce((s, a) => s + (a.seconds_taken ?? 0), 0) / timed.length)
    : null;

  // per-topic accuracy for this session
  const byTopic = new Map<string, { right: number; total: number }>();
  for (const qid of session.question_ids) {
    const q = reviewQuestions.find((x) => x.id === qid);
    if (!q) continue;
    const cur = byTopic.get(q.topic_id) ?? { right: 0, total: 0 };
    cur.total += 1;
    if (attemptByQ.get(qid)?.is_correct) cur.right += 1;
    byTopic.set(q.topic_id, cur);
  }

  const missed = (session.question_ids as string[])
    .map((qid) => reviewQuestions.find((q) => q.id === qid))
    .filter(
      (q): q is NonNullable<typeof q> =>
        !!q && !attemptByQ.get(q.id)?.is_correct
    );

  const verdict = isMock
    ? score >= PASS_LINE
      ? `Above the ${PASS_LINE} pass line — a passing paper if exam day looked like this.`
      : score >= SUBJECT_FLOOR
        ? `Above the ${SUBJECT_FLOOR} floor but under the ${PASS_LINE} pass line — this paper wouldn't pass on its own.`
        : `Below the ${SUBJECT_FLOOR} floor — on exam day this subject would block the whole exam. Make it your priority.`
    : score >= 85
      ? "Exam-ready performance. Keep it warm."
      : score >= 75
        ? "Above the pass line — solid work."
        : score >= 60
          ? "Below the 75 pass line. The explanations below are your study list."
          : "Rough one — that's what practice is for. Review every miss below.";

  const budget = subject
    ? secondsPerItem(subject.exam_minutes, subject.exam_item_count)
    : null;

  return (
    <>
      <PageHeader
        eyebrow={
          isReview
            ? "Review session"
            : `${subject?.code ?? ""} · ${isMock ? "Mock exam" : "Practice"}`
        }
        title={
          isMock
            ? "Mock exam results"
            : isReview
              ? "Review results"
              : "Session results"
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-8">
        <MasteryRing score={score} label="score" size={110} />
        <div className="flex-1">
          <p className="max-w-md text-[15px] font-medium text-ink-900">{verdict}</p>
          <div className="mt-4 flex gap-10">
            <StatBlock value={correct} label="Correct" />
            <StatBlock value={wrongOrBlank} label="Missed" />
            {avgSeconds !== null && (
              <StatBlock
                value={`${avgSeconds}s`}
                label={
                  isMock && budget
                    ? `Avg per item (budget ${budget}s)`
                    : "Avg per question"
                }
              />
            )}
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <h3 className="text-[17px] font-semibold text-ink-900">By topic</h3>
        <div className="mt-4 space-y-3">
          {[...byTopic.entries()].map(([tid, r]) => {
            const pct = Math.round((r.right / r.total) * 100);
            return (
              <div key={tid} className="flex items-center gap-4">
                <span className="w-56 truncate text-[14px] font-medium text-ink-900">
                  {topicName.get(tid) ?? "Topic"}
                </span>
                <MasteryBar score={pct} className="flex-1" />
                <span className="w-16 text-right text-[13px] text-ink-400 tabular-nums">
                  {r.right}/{r.total}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {missed.length > 0 && (
        <Card className="mb-5 p-0">
          <h3 className="px-6 pt-6 text-[17px] font-semibold text-ink-900">
            Review your misses ({missed.length})
          </h3>
          <div className="mt-2 divide-y divide-line">
            {missed.map((q) => {
              const a = attemptByQ.get(q!.id);
              return (
                <details key={q!.id} className="group px-6 py-4">
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-learning-bg text-learning">
                      <X size={13} />
                    </span>
                    <span className="flex-1 text-[15px] font-medium text-ink-900">
                      {q!.stem}
                    </span>
                    <ChevronDown
                      size={18}
                      className="mt-1 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="mt-4 space-y-2 pl-9">
                    {q!.choices.map((choice: string, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius-control)] border p-3 text-[14px]",
                          i === q!.correct_index
                            ? "border-mastered bg-mastered-bg text-ink-900"
                            : i === a?.chosen_index
                              ? "border-learning bg-learning-bg text-ink-900"
                              : "border-line text-ink-600"
                        )}
                      >
                        <span className="text-[12px] font-bold">
                          {i === q!.correct_index ? <Check size={14} /> : LETTERS[i]}
                        </span>
                        {choice}
                        {i === a?.chosen_index && i !== q!.correct_index && (
                          <span className="ml-auto text-[11px] font-semibold text-learning">
                            your answer
                          </span>
                        )}
                        {a == null && i === q!.correct_index && (
                          <span className="ml-auto text-[11px] font-semibold text-mastered">
                            unanswered — correct choice
                          </span>
                        )}
                      </div>
                    ))}
                    <p className="rounded-[var(--radius-control)] bg-tint/40 p-3 text-[14px] leading-relaxed">
                      {q!.explanation}
                    </p>
                  </div>
                </details>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {isMock ? (
          <ButtonLink href="/mocks">Back to mock exams</ButtonLink>
        ) : isReview ? (
          <ButtonLink href="/review">Back to review queue</ButtonLink>
        ) : (
          <ButtonLink href={`/practice?subject=${subject?.code?.toLowerCase() ?? ""}`}>
            Practice again
          </ButtonLink>
        )}
        <ButtonLink href="/dashboard" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </>
  );
}
