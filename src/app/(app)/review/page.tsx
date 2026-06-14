import { CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { manilaToday } from "@/lib/dates";
import { REVIEW_INTERVALS } from "@/lib/review";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";
import { StartReviewButton } from "./start-review-button";

export default async function ReviewPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ count: dueCount }, { count: queueCount }, subjects] =
    await Promise.all([
      supabase
        .from("review_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("cleared", false)
        .lte("due_at", manilaToday()),
      supabase
        .from("review_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("cleared", false),
      getSyllabusOverview(user.id),
    ]);

  const due = dueCount ?? 0;
  const inQueue = queueCount ?? 0;
  const staleTopics = subjects
    .flatMap((s) => s.topics.map((t) => ({ ...t, subjectCode: s.code })))
    .filter((t) => t.stale);
  const weakest = subjects
    .flatMap((s) => s.topics.map((t) => ({ ...t, subjectCode: s.code })))
    .filter((t) => t.band !== "not-started")
    .sort((a, b) => a.mastery - b.mastery)[0];

  const canStart = due > 0 || staleTopics.length > 0;

  return (
    <>
      <PageHeader eyebrow="Review" title="Today's review queue" />

      {canStart ? (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center gap-8">
            <StatBlock gradient value={due} label="Due today" />
            <StatBlock value={inQueue} label="In the queue" />
            {staleTopics.length > 0 && (
              <StatBlock value={staleTopics.length} label="Stale topics" />
            )}
            <div className="ml-auto">
              <StartReviewButton dueCount={due} />
            </div>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-400">
            Missed questions return at {REVIEW_INTERVALS.join(" → ")} days; four
            correct reviews in a row clears one for good. Short days are topped
            up with refreshers from topics you haven&apos;t touched in a while.
          </p>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<CheckCircle2 size={28} strokeWidth={1.75} />}
            title="All clear — nothing due"
            body={
              weakest
                ? `No reviews due and nothing's gone stale. Keep momentum on your weakest topic instead: ${weakest.subjectCode} · ${weakest.name}.`
                : "No reviews due. Take a practice quiz to start building your queue — every miss comes back at the right time."
            }
            action={
              weakest ? (
                <Link
                  href={`/practice?subject=${weakest.subjectCode.toLowerCase()}&topic=${weakest.id}`}
                  className="bg-brand-gradient inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-6 text-[15px] font-semibold text-brand-deep shadow-card"
                >
                  <RotateCcw size={16} /> Practice {weakest.subjectCode}
                </Link>
              ) : (
                <Link
                  href="/practice"
                  className="bg-brand-gradient inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-6 text-[15px] font-semibold text-brand-deep shadow-card"
                >
                  Take a practice quiz
                </Link>
              )
            }
          />
        </Card>
      )}
    </>
  );
}
