import { Lock, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries";
import { mockUnlockTarget } from "@/lib/mock";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { IconBubble } from "@/components/ui/icon-bubble";
import { StatBlock } from "@/components/ui/stat-block";
import { StartMockButton } from "./start-mock-button";

export default async function MocksPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: subjects }, { data: topics }, { data: questions }, { data: mocks }] =
    await Promise.all([
      supabase.from("subjects").select("*").order("sort_order"),
      supabase.from("topics").select("id, subject_id"),
      supabase.from("questions").select("topic_id").eq("is_active", true),
      supabase
        .from("quiz_sessions")
        .select("subject_id, score_pct, completed_at")
        .eq("user_id", user.id)
        .eq("type", "mock")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false }),
    ]);

  const subjectOfTopic = new Map((topics ?? []).map((t) => [t.id, t.subject_id]));
  const bankBySubject = new Map<string, number>();
  for (const q of questions ?? []) {
    const sid = subjectOfTopic.get(q.topic_id);
    if (sid) bankBySubject.set(sid, (bankBySubject.get(sid) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Mock exams"
        title="Full-format simulations"
        action={undefined}
      />
      <p className="-mt-3 mb-6 max-w-2xl text-[15px]">
        The real thing, rehearsed: actual item counts, the 3-hour clock, TOS
        weighting, and no feedback until you submit. Blanks score as wrong —
        exactly like exam day.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(subjects ?? []).map((s) => {
          const bank = bankBySubject.get(s.id) ?? 0;
          const target = mockUnlockTarget(s.exam_item_count);
          const unlocked = bank >= target;
          const subjectMocks = (mocks ?? []).filter((m) => m.subject_id === s.id);
          const last = subjectMocks[0];
          const best = subjectMocks.reduce(
            (b, m) => Math.max(b, Number(m.score_pct ?? 0)),
            0
          );

          return (
            <Card key={s.id} className={unlocked ? "" : "opacity-80"}>
              <div className="flex items-start justify-between">
                <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
                  {s.code}
                </div>
                <IconBubble
                  className={
                    unlocked ? undefined : "bg-notstarted-bg text-notstarted"
                  }
                >
                  {unlocked ? (
                    <Timer size={20} strokeWidth={1.75} />
                  ) : (
                    <Lock size={20} strokeWidth={1.75} />
                  )}
                </IconBubble>
              </div>
              <div className="mt-1 min-h-12 text-[17px] font-semibold leading-snug text-ink-900">
                {s.name}
              </div>
              <div className="text-[13px] text-ink-400">
                {s.exam_item_count} items · {s.exam_minutes / 60} hours
              </div>

              {unlocked ? (
                <>
                  {subjectMocks.length > 0 && (
                    <div className="mt-4 flex gap-8">
                      <StatBlock value={Math.round(Number(last!.score_pct))} label="Last score" />
                      <StatBlock value={Math.round(best)} label="Best score" />
                    </div>
                  )}
                  <div className="mt-4">
                    <StartMockButton subjectId={s.id} code={s.code} />
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[12px] text-ink-400">
                    <span>Question bank</span>
                    <span className="tabular-nums">
                      {bank} / {target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-notstarted"
                      style={{ width: `${Math.min((bank / target) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-ink-400">
                    Unlocks at {target} questions so one mock can&apos;t exhaust
                    the bank.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
