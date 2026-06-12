import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { BandChip } from "@/components/ui/band";

export default async function SubjectsPage() {
  const user = await requireUser();
  const subjects = await getSyllabusOverview(user.id);

  return (
    <>
      <PageHeader eyebrow="Syllabus" title="Subjects" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <Link key={s.id} href={`/subjects/${s.code.toLowerCase()}`}>
            <Card interactive className="h-full">
              <div className="flex items-start justify-between">
                <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
                  {s.code}
                </div>
                <ChevronRight size={18} className="text-ink-400" />
              </div>
              <div className="mt-1 min-h-12 text-[17px] font-semibold leading-snug text-ink-900">
                {s.name}
              </div>
              <div className="mt-1 text-[13px] text-ink-400">
                {s.topics.length} topics · {s.exam_item_count} exam items
              </div>
              <div className="mt-4">
                {s.attempted ? (
                  <div className="flex items-center gap-3">
                    <MasteryBar score={s.readiness} className="flex-1" />
                    <span className="text-[17px] font-bold text-ink-900 tabular-nums">
                      {s.readiness}
                    </span>
                  </div>
                ) : (
                  <BandChip band="not-started" />
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
