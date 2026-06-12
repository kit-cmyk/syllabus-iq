"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3x3,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { saveMockAnswer, setFlag } from "../actions";
import { completeSession } from "../../quiz/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type MockQuestion = { id: string; stem: string; choices: string[] };

const LETTERS = ["A", "B", "C", "D"];

export function MockPlayer({
  sessionId,
  subjectCode,
  questions,
  initialAnswers,
  initialFlagged,
  deadline,
}: {
  sessionId: string;
  subjectCode: string;
  questions: MockQuestion[];
  initialAnswers: Record<string, number>;
  initialFlagged: string[];
  deadline: number;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set(initialFlagged));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [, startTransition] = useTransition();
  const finishingRef = useRef(false);

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const unanswered = questions.length - answeredCount;

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    startTransition(async () => {
      const r = await completeSession(sessionId);
      if (r && "error" in r) {
        setError(r.error);
        finishingRef.current = false;
        setFinishing(false);
      }
    });
  }, [sessionId, startTransition]);

  // countdown — auto-submit at 0:00, exactly like the real exam
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline) finish();
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, finish]);
  const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = remaining % 60;

  const select = useCallback(
    (choice: number) => {
      const qid = question.id;
      const prev = answers[qid];
      setAnswers((a) => ({ ...a, [qid]: choice }));
      setError(null);
      startTransition(async () => {
        const r = await saveMockAnswer(sessionId, qid, choice);
        if ("error" in r) {
          // revert the optimistic save so the palette never lies
          setAnswers((a) => {
            const next = { ...a };
            if (prev === undefined) delete next[qid];
            else next[qid] = prev;
            return next;
          });
          setError(r.error);
        }
      });
    },
    [question, answers, sessionId, startTransition]
  );

  const toggleFlag = useCallback(() => {
    const qid = question.id;
    const next = !flagged.has(qid);
    setFlagged((f) => {
      const s = new Set(f);
      if (next) s.add(qid);
      else s.delete(qid);
      return s;
    });
    startTransition(async () => {
      const r = await setFlag(sessionId, qid, next);
      if ("error" in r) {
        setFlagged((f) => {
          const s = new Set(f);
          if (next) s.delete(qid);
          else s.add(qid);
          return s;
        });
      }
    });
  }, [question, flagged, sessionId, startTransition]);

  // keyboard: 1–4 answer, ←/→ navigate, F flag
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "4") select(Number(e.key) - 1);
      else if (e.key === "ArrowRight" && index < questions.length - 1)
        setIndex(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      else if (e.key.toLowerCase() === "f") toggleFlag();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, toggleFlag, index, questions.length]);

  if (finishing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[15px] text-ink-400">
        Submitting and scoring your mock…
      </div>
    );
  }

  const paletteState = (q: MockQuestion, i: number) =>
    cn(
      "flex size-9 items-center justify-center rounded-lg border text-[12px] font-semibold transition-colors",
      i === index && "ring-2 ring-brand",
      flagged.has(q.id)
        ? "border-developing bg-developing-bg text-developing"
        : answers[q.id] !== undefined
          ? "border-brand bg-brand text-white"
          : "border-line bg-card text-ink-600"
    );

  const palette = (
    <div>
      <div className="grid grid-cols-7 gap-1.5 lg:grid-cols-5 xl:grid-cols-7">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => {
              setIndex(i);
              setPaletteOpen(false);
            }}
            className={paletteState(q, i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> Answered
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-developing" /> Flagged
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line bg-card" /> Blank
        </span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* exam header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-[13px] font-bold uppercase tracking-wide text-ink-900">
          {subjectCode} Mock
        </span>
        <span className="text-[13px] text-ink-400 tabular-nums">
          {answeredCount}/{questions.length} answered
        </span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-bold tabular-nums",
            remaining < 300
              ? "bg-learning-bg text-learning animate-pulse"
              : "bg-page text-ink-900"
          )}
        >
          <Clock size={15} />
          {hh}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => setPaletteOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full bg-page px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 lg:hidden"
        >
          <Grid3x3 size={15} /> {paletteOpen ? "Hide" : "Items"}
        </button>
      </div>

      {/* mobile palette drawer */}
      {paletteOpen && (
        <Card className="mb-5 lg:hidden">{palette}</Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
              Item {index + 1} of {questions.length}
            </div>
            <button
              type="button"
              onClick={toggleFlag}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold transition-colors",
                flagged.has(question.id)
                  ? "bg-developing-bg text-developing"
                  : "bg-page text-ink-400 hover:text-ink-900"
              )}
            >
              <Bookmark
                size={14}
                className={flagged.has(question.id) ? "fill-developing" : undefined}
              />
              {flagged.has(question.id) ? "Flagged" : "Flag for review"}
            </button>
          </div>

          <h2 className="mt-2 text-[19px] font-medium leading-relaxed text-ink-900">
            {question.stem}
          </h2>

          <div className="mt-5 space-y-3">
            {question.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-[var(--radius-control)] border bg-card p-4 text-left transition-colors",
                  answers[question.id] === i
                    ? "border-brand bg-tint/50 ring-1 ring-brand"
                    : "border-line hover:border-ink-400"
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-tint text-[13px] font-bold text-brand">
                  {LETTERS[i]}
                </span>
                <span className="text-[15px] text-ink-900">{choice}</span>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ChevronLeft size={16} /> Prev
            </Button>
            <Button
              variant="secondary"
              disabled={index === questions.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Next <ChevronRight size={16} />
            </Button>
            <Button className="ml-auto" onClick={() => setConfirmOpen(true)}>
              Submit mock
            </Button>
          </div>
        </div>

        {/* desktop palette */}
        <Card className="sticky top-6 hidden h-fit lg:block">{palette}</Card>
      </div>

      {/* submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center">
          <Card className="w-full max-w-md shadow-float">
            <div className="flex items-start justify-between">
              <h3 className="text-[17px] font-semibold text-ink-900">
                Submit this mock?
              </h3>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-ink-400 hover:text-ink-900"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-[15px]">
              {unanswered > 0 ? (
                <>
                  <strong className="text-learning">{unanswered} unanswered</strong>{" "}
                  item{unanswered === 1 ? "" : "s"} will score as wrong
                  {flagged.size > 0 && (
                    <> · {flagged.size} still flagged for review</>
                  )}
                  .
                </>
              ) : flagged.size > 0 ? (
                <>{flagged.size} item{flagged.size === 1 ? " is" : "s are"} still flagged for review.</>
              ) : (
                "All items answered. Scoring is final — just like handing in your paper."
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={finish} className="flex-1">
                Submit & score
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                className="flex-1"
              >
                Keep working
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
