"use client";

import { useMemo, useState, useTransition } from "react";
import { GraduationCap, TimerIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Band, QuizMode } from "@/lib/types";
import { createSession } from "../quiz/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandChip } from "@/components/ui/band";
import { IconBubble } from "@/components/ui/icon-bubble";

type SubjectOption = {
  id: string;
  code: string;
  name: string;
  topics: { id: string; name: string; band: Band; mastery: number }[];
};

export function SetupForm({
  subjects,
  initialSubjectId,
  initialTopicId,
}: {
  subjects: SubjectOption[];
  initialSubjectId?: string;
  initialTopicId: string | null;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? subjects[0]?.id);
  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId)!,
    [subjects, subjectId]
  );
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    () => new Set(initialTopicId ? [initialTopicId] : subject?.topics.map((t) => t.id) ?? [])
  );
  const [count, setCount] = useState<10 | 20 | 30>(10);
  const [mode, setMode] = useState<QuizMode>("tutor");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickSubject(id: string) {
    setSubjectId(id);
    const next = subjects.find((s) => s.id === id)!;
    setSelectedTopics(new Set(next.topics.map((t) => t.id)));
  }

  function toggleTopic(id: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = selectedTopics.size === subject.topics.length;

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await createSession({
        subjectId,
        topicIds: [...selectedTopics],
        count,
        mode,
      });
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <Card className="mx-auto max-w-xl space-y-7">
      <div>
        <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">
          Subject
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickSubject(s.id)}
              className={cn(
                "rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                s.id === subjectId
                  ? "bg-tint text-brand ring-2 ring-brand"
                  : "bg-page text-ink-600 hover:text-ink-900"
              )}
            >
              {s.code}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
            Topics
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedTopics(
                allSelected ? new Set() : new Set(subject.topics.map((t) => t.id))
              )
            }
            className="text-[13px] font-semibold text-brand"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {subject.topics.map((t) => (
            <label
              key={t.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3.5 py-2.5 transition-colors",
                selectedTopics.has(t.id)
                  ? "border-brand bg-tint/50"
                  : "border-line hover:border-ink-400"
              )}
            >
              <input
                type="checkbox"
                checked={selectedTopics.has(t.id)}
                onChange={() => toggleTopic(t.id)}
                className="size-4 accent-(--color-brand)"
              />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-900">
                {t.name}
              </span>
              <BandChip band={t.band} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">
          Questions
        </div>
        <div className="inline-flex rounded-full bg-page p-1">
          {([10, 20, 30] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={cn(
                "rounded-full px-5 py-2 text-[14px] font-semibold transition-all",
                count === n ? "bg-card text-ink-900 shadow-card" : "text-ink-400"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">
          Mode
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "tutor",
                icon: <GraduationCap size={20} strokeWidth={1.75} />,
                title: "Tutor",
                desc: "Feedback after each question",
                bubble: "",
              },
              {
                value: "timed",
                icon: <TimerIcon size={20} strokeWidth={1.75} />,
                title: "Timed",
                desc: "90s per question, results at the end",
                bubble: "bg-developing-bg text-developing",
              },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors",
                mode === m.value
                  ? "border-brand bg-tint/50 ring-1 ring-brand"
                  : "border-line hover:border-ink-400"
              )}
            >
              <IconBubble className={m.bubble || undefined}>{m.icon}</IconBubble>
              <span>
                <span className="block text-[15px] font-semibold text-ink-900">
                  {m.title}
                </span>
                <span className="block text-[13px] text-ink-400">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning">
          {error}
        </p>
      )}

      <Button
        onClick={start}
        disabled={pending || selectedTopics.size === 0}
        className="w-full"
      >
        {pending ? "Building your quiz…" : "Start practice"}
      </Button>
    </Card>
  );
}
