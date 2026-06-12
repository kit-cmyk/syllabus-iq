import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { SetupForm } from "./setup-form";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; topic?: string }>;
}) {
  const { subject, topic } = await searchParams;
  const user = await requireUser();
  const subjects = await getSyllabusOverview(user.id);

  const initialSubject =
    subjects.find((s) => s.code.toLowerCase() === subject?.toLowerCase())?.id ??
    subjects[0]?.id;

  return (
    <>
      <PageHeader eyebrow="Practice" title="Set up your quiz" />
      <SetupForm
        subjects={subjects.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          topics: s.topics.map((t) => ({
            id: t.id,
            name: t.name,
            band: t.band,
            mastery: t.mastery,
          })),
        }))}
        initialSubjectId={initialSubject}
        initialTopicId={topic ?? null}
      />
    </>
  );
}
