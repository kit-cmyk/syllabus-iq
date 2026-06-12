import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, BookOpen, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { BandChip } from "@/components/ui/band";
import { ButtonLink } from "@/components/ui/button";
import { StatBlock } from "@/components/ui/stat-block";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const subjects = await getSyllabusOverview(user.id);
  const subject = subjects.find((s) => s.code.toLowerCase() === code.toLowerCase());
  if (!subject) notFound();

  const { data: materialRows } = await supabase
    .from("materials")
    .select("topic_id")
    .in(
      "topic_id",
      subject.topics.map((t) => t.id)
    )
    .eq("is_active", true);
  const materialCount = new Map<string, number>();
  for (const m of materialRows ?? []) {
    materialCount.set(m.topic_id, (materialCount.get(m.topic_id) ?? 0) + 1);
  }

  const seen = subject.topics.reduce((n, t) => n + t.distinctSeen, 0);
  const attemptedTopics = subject.topics.filter((t) => t.band !== "not-started").length;

  return (
    <>
      <PageHeader
        eyebrow={subject.code}
        title={subject.name}
        action={
          <ButtonLink href={`/practice?subject=${subject.code.toLowerCase()}`}>
            Practice {subject.code}
          </ButtonLink>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center gap-8">
        <MasteryRing
          score={subject.readiness}
          hasAttempts={subject.attempted}
          label="readiness"
        />
        <StatBlock value={`${attemptedTopics}/${subject.topics.length}`} label="Topics started" />
        <StatBlock value={seen} label="Questions seen" />
        <StatBlock value={`${subject.exam_item_count}`} label="Items on exam day" />
      </Card>

      <p className="mb-3 text-[13px] text-ink-400">
        Open a topic to read the notes, watch the videos, and quiz yourself on it.
      </p>

      <Card className="divide-y divide-line p-0">
        {subject.topics.map((t) => {
          const nMaterials = materialCount.get(t.id) ?? 0;
          return (
            <Link
              key={t.id}
              href={`/subjects/${subject.code.toLowerCase()}/${t.id}`}
              className="group flex flex-col gap-3 p-5 transition-colors hover:bg-page/60 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-page px-2 py-0.5 text-[11px] font-semibold text-ink-400 tabular-nums">
                    {t.tos_weight}%
                  </span>
                  <span className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-brand">
                    {t.name}
                  </span>
                  {t.stale && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-developing-bg px-2 py-0.5 text-[11px] font-medium text-developing">
                      <Clock size={11} /> Stale
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen size={12} />
                    {nMaterials > 0
                      ? `${nMaterials} material${nMaterials === 1 ? "" : "s"}`
                      : "Materials coming soon"}
                  </span>
                  {t.distinctSeen > 0 && t.distinctSeen < 15 && (
                    <span>{t.distinctSeen} of 15 questions seen</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <BandChip band={t.band} />
                <div className="flex w-40 items-center gap-2">
                  <MasteryBar
                    score={t.mastery}
                    hasAttempts={t.band !== "not-started"}
                    className="flex-1"
                  />
                  <span className="w-7 text-right text-[15px] font-bold text-ink-900 tabular-nums">
                    {t.band === "not-started" ? "–" : t.mastery}
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className="text-ink-400 transition-colors group-hover:text-brand"
                />
              </div>
            </Link>
          );
        })}
      </Card>
    </>
  );
}
