"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, X, Lightbulb, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { QuizMode } from "@/lib/types";
import { submitAnswer, completeSession, type AnswerResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PlayerQuestion = {
  id: string;
  topic_id: string;
  stem: string;
  choices: string[];
};

const LETTERS = ["A", "B", "C", "D"];

export function QuizPlayer({
  sessionId,
  mode,
  questions,
  topicNames,
  initialAnswered,
  deadline,
  refresherIds = [],
}: {
  sessionId: string;
  mode: QuizMode;
  questions: PlayerQuestion[];
  topicNames: Record<string, string>;
  initialAnswered: { question_id: string; chosen_index: number; is_correct: boolean }[];
  deadline: number | null;
  refresherIds?: string[];
}) {
  const answeredIds = useMemo(
    () => new Set(initialAnswered.map((a) => a.question_id)),
    [initialAnswered]
  );
  const firstUnanswered = questions.findIndex((q) => !answeredIds.has(q.id));
  const alreadyDone = firstUnanswered === -1;

  const [index, setIndex] = useState(alreadyDone ? questions.length - 1 : firstUnanswered);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(alreadyDone);
  const [pending, startTransition] = useTransition();
  const finishingRef = useRef(alreadyDone);
  const questionStartedAt = useRef(0);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const progressPct = ((index + (feedback ? 1 : 0)) / questions.length) * 100;

  const runComplete = useCallback(() => {
    startTransition(async () => {
      const r = await completeSession(sessionId);
      if (r && "error" in r) {
        setError(r.error);
        finishingRef.current = false;
        setFinishing(false);
      }
    });
  }, [sessionId, startTransition]);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    runComplete();
  }, [runComplete]);

  // Refresh on a fully-answered session goes straight to scoring.
  useEffect(() => {
    if (alreadyDone) runComplete();
  }, [alreadyDone, runComplete]);

  // Stopwatch for seconds_taken restarts whenever a new question shows.
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [index]);

  // ----- timed-mode countdown -----
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadline) finish();
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, finish]);
  const remaining = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null;

  const advance = useCallback(() => {
    setFeedback(null);
    setSelected(null);
    questionStartedAt.current = Date.now();
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }, [isLast, finish]);

  const confirm = useCallback(() => {
    if (selected === null || pending || feedback) return;
    setError(null);
    const seconds = (Date.now() - questionStartedAt.current) / 1000;
    startTransition(async () => {
      const result = await submitAnswer(sessionId, question.id, selected, seconds);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (mode === "tutor") {
        setFeedback(result);
      } else {
        advance();
      }
    });
  }, [selected, pending, feedback, sessionId, question, mode, advance, startTransition]);

  // Keyboard: 1–4 select, Enter confirm/next
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "4" && !feedback) {
        setSelected(Number(e.key) - 1);
      } else if (e.key === "Enter") {
        if (feedback) advance();
        else confirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, advance, confirm]);

  if (finishing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[15px] text-ink-400">
        Scoring your session…
      </div>
    );
  }

  function choiceStyle(i: number) {
    if (feedback) {
      if (i === feedback.correctIndex) return "border-mastered bg-mastered-bg";
      if (i === selected && !feedback.isCorrect)
        return "border-learning bg-learning-bg";
      return "border-line opacity-60";
    }
    return i === selected
      ? "border-brand bg-tint/50 ring-1 ring-brand"
      : "border-line hover:border-ink-400";
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* slim progress bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[13px] font-semibold text-ink-600 tabular-nums">
          {Math.min(index + 1, questions.length)} / {questions.length}
        </span>
        {remaining !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums",
              remaining < 300
                ? "bg-learning-bg text-learning animate-pulse"
                : "bg-page text-ink-600"
            )}
          >
            <Clock size={14} />
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-ink-400">
        {topicNames[question.topic_id] ?? "Question"}
        {refresherIds.includes(question.id) && (
          <span className="rounded-full bg-notstarted-bg px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-notstarted">
            Refresher — stale topic
          </span>
        )}
      </div>
      <h2 className="mt-2 text-[20px] font-medium leading-relaxed text-ink-900">
        {question.stem}
      </h2>

      <div className="mt-6 space-y-3">
        {question.choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            disabled={!!feedback || pending}
            onClick={() => setSelected(i)}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[var(--radius-control)] border bg-card p-4 text-left transition-colors",
              choiceStyle(i)
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold",
                feedback && i === feedback.correctIndex
                  ? "bg-mastered text-white"
                  : feedback && i === selected && !feedback.isCorrect
                    ? "bg-learning text-white"
                    : "bg-tint text-brand"
              )}
            >
              {feedback && i === feedback.correctIndex ? (
                <Check size={15} />
              ) : feedback && i === selected && !feedback.isCorrect ? (
                <X size={15} />
              ) : (
                LETTERS[i]
              )}
            </span>
            <span className="text-[15px] text-ink-900">{choice}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <Card className="mt-5 flex gap-3.5 border-l-4 border-brand bg-tint/40">
          <Lightbulb size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <div className="text-[15px] font-semibold text-ink-900">
              {feedback.isCorrect ? "Correct!" : "Not quite."}
            </div>
            <p className="mt-1 text-[15px] leading-relaxed">{feedback.explanation}</p>
            {feedback.review && (
              <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-3">
                <span className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className={cn(
                        "size-2.5 rounded-full",
                        feedback.review!.cleared ||
                          s < (feedback.review!.step ?? 0)
                          ? "bg-mastered"
                          : "bg-line"
                      )}
                    />
                  ))}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    feedback.review.cleared ? "text-mastered" : "text-ink-600"
                  )}
                >
                  {feedback.review.cleared
                    ? "Cleared — off your review list!"
                    : feedback.isCorrect
                      ? `Next review in ${feedback.review.dueInDays} day${feedback.review.dueInDays === 1 ? "" : "s"}`
                      : "Back to step 1 — due tomorrow"}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {error && (
        <p className="mt-4 rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning">
          {error}
        </p>
      )}

      <div className="mt-6">
        {feedback ? (
          <Button onClick={advance} className="w-full sm:w-auto sm:px-10">
            {isLast ? "See results" : "Next →"}
          </Button>
        ) : (
          <Button
            onClick={confirm}
            disabled={selected === null || pending}
            className="w-full sm:w-auto sm:px-10"
          >
            {pending ? "Checking…" : mode === "tutor" ? "Check answer" : isLast ? "Finish" : "Next →"}
          </Button>
        )}
      </div>
    </div>
  );
}
