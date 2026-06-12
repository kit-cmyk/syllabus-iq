import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { TrendStrip } from "@/components/ui/trend-strip";
import { BandChip } from "@/components/ui/band";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MaterialCard, type Material } from "@/components/material-card";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ code: string; topicId: string }>;
}) {
  const { code, topicId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const subjects = await getSyllabusOverview(user.id);
  const subject = subjects.find((s) => s.code.toLowerCase() === code.toLowerCase());
  const topic = subject?.topics.find((t) => t.id === topicId);
  if (!subject || !topic) notFound();

  const [{ data: materials }, { data: lastAttempts }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, type, title, body, video_url, duration_minutes")
      .eq("topic_id", topicId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("attempts")
      .select("is_correct")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const practiceHref = `/practice?subject=${subject.code.toLowerCase()}&topic=${topic.id}`;
  const trend = (lastAttempts ?? []).map((a) => a.is_correct).reverse();

  return (
    <>
      <Link
        href={`/subjects/${subject.code.toLowerCase()}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-400 hover:text-brand"
      >
        <ArrowLeft size={14} /> {subject.name}
      </Link>
      <PageHeader
        eyebrow={`${subject.code} · ${topic.tos_weight}% of the exam`}
        title={topic.name}
        action={<ButtonLink href={practiceHref}>Practice this topic</ButtonLink>}
      />

      <Card className="mb-6 flex flex-wrap items-center gap-x-10 gap-y-4">
        <MasteryRing
          score={topic.mastery}
          hasAttempts={topic.band !== "not-started"}
          size={88}
          label="mastery"
        />
        <div>
          <BandChip band={topic.band} />
          {topic.stale && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-developing-bg px-2 py-0.5 text-[11px] font-medium text-developing">
              <Clock size={11} /> Stale
            </span>
          )}
          <div className="mt-2 text-[13px] text-ink-400">
            {topic.distinctSeen === 0
              ? "No questions attempted yet — read the materials, then take a quiz."
              : topic.distinctSeen < 15
                ? `${topic.distinctSeen} of 15 questions seen — coverage still building.`
                : `${topic.distinctSeen} distinct questions seen.`}
          </div>
        </div>
        {trend.length > 0 && (
          <div className="ml-auto">
            <div className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-ink-400">
              Last {trend.length} answers
            </div>
            <TrendStrip results={trend} />
          </div>
        )}
      </Card>

      <h2 className="mb-3 text-[17px] font-semibold text-ink-900">
        Study materials
      </h2>
      {(materials ?? []).length > 0 ? (
        <div className="space-y-4">
          {(materials as Material[]).map((m, i) => (
            <MaterialCard key={m.id} material={m} defaultOpen={i === 0} />
          ))}
          <Card className="flex flex-wrap items-center justify-between gap-4 bg-tint/40">
            <div>
              <div className="text-[15px] font-semibold text-ink-900">
                Done reviewing?
              </div>
              <div className="text-[13px] text-ink-400">
                Lock it in while it&apos;s fresh — quiz results update your mastery instantly.
              </div>
            </div>
            <ButtonLink href={practiceHref}>Quiz me on this topic</ButtonLink>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BookOpen size={28} strokeWidth={1.75} />}
            title="Materials coming soon"
            body="Readings and videos for this topic haven't been added yet. You can still test yourself with a practice quiz."
            action={<ButtonLink href={practiceHref}>Practice this topic</ButtonLink>}
          />
        </Card>
      )}
    </>
  );
}
