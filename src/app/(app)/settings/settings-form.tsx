"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function Notice({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={
        kind === "ok"
          ? "rounded-[var(--radius-control)] bg-mastered-bg px-4 py-3 text-[13px] font-medium text-mastered"
          : "rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning"
      }
    >
      {children}
    </p>
  );
}

export function SettingsForm({
  email,
  fullName,
  dailyGoal,
  examDate,
}: {
  email: string;
  fullName: string;
  dailyGoal: number;
  examDate: string;
}) {
  const router = useRouter();
  const [nameMsg, setNameMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [goalMsg, setGoalMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [examMsg, setExamMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingExam, setSavingExam] = useState(false);

  async function saveExamDate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExamMsg(null);
    const value = String(new FormData(e.currentTarget).get("exam_date") || "");
    setSavingExam(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("user_stats")
      .upsert(
        { user_id: user!.id, exam_date: value || null },
        { onConflict: "user_id" }
      );
    setExamMsg(
      error
        ? { kind: "err", text: "Could not save — run migration 0008 if this persists." }
        : { kind: "ok", text: value ? "Exam date saved." : "Exam date cleared." }
    );
    setSavingExam(false);
    if (!error) router.refresh();
  }

  async function saveGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGoalMsg(null);
    const goal = Number(new FormData(e.currentTarget).get("daily_goal"));
    if (!Number.isInteger(goal) || goal < 10 || goal > 100) {
      setGoalMsg({ kind: "err", text: "Pick a goal between 10 and 100 questions." });
      return;
    }
    setSavingGoal(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("user_stats")
      .upsert({ user_id: user!.id, daily_goal: goal }, { onConflict: "user_id" });
    setGoalMsg(
      error
        ? { kind: "err", text: "Could not save — run migration 0007 if this persists." }
        : { kind: "ok", text: `Daily goal set to ${goal} questions.` }
    );
    setSavingGoal(false);
    if (!error) router.refresh();
  }

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameMsg(null);
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: String(new FormData(e.currentTarget).get("name")) },
    });
    setNameMsg(
      error
        ? { kind: "err", text: error.message }
        : { kind: "ok", text: "Name updated." }
    );
    setSavingName(false);
    if (!error) router.refresh();
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMsg(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setPwMsg({ kind: "err", text: "Passwords don't match." });
      return;
    }
    setSavingPw(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPwMsg(
      error
        ? { kind: "err", text: error.message }
        : { kind: "ok", text: "Password changed." }
    );
    setSavingPw(false);
    if (!error) (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="max-w-xl space-y-5">
      <Card>
        <h3 className="text-[17px] font-semibold text-ink-900">Profile</h3>
        <form onSubmit={saveName} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="opacity-60" />
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" defaultValue={fullName} required />
          </div>
          {nameMsg && <Notice kind={nameMsg.kind}>{nameMsg.text}</Notice>}
          <Button type="submit" disabled={savingName}>
            {savingName ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-[17px] font-semibold text-ink-900">Daily goal</h3>
        <p className="mt-1 text-[13px] text-ink-400">
          Questions per day. Hitting it earns +50 XP, once a day.
        </p>
        <form onSubmit={saveGoal} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="daily_goal">Questions per day (10–100)</Label>
            <Input
              id="daily_goal"
              name="daily_goal"
              type="number"
              min={10}
              max={100}
              step={5}
              defaultValue={dailyGoal}
              required
            />
          </div>
          {goalMsg && <Notice kind={goalMsg.kind}>{goalMsg.text}</Notice>}
          <Button type="submit" disabled={savingGoal}>
            {savingGoal ? "Saving…" : "Save goal"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-[17px] font-semibold text-ink-900">Target exam date</h3>
        <p className="mt-1 text-[13px] text-ink-400">
          Drives the dashboard countdown. Leave blank to hide it.
        </p>
        <form onSubmit={saveExamDate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="exam_date">Exam date</Label>
            <Input id="exam_date" name="exam_date" type="date" defaultValue={examDate} />
          </div>
          {examMsg && <Notice kind={examMsg.kind}>{examMsg.text}</Notice>}
          <Button type="submit" disabled={savingExam}>
            {savingExam ? "Saving…" : "Save exam date"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-[17px] font-semibold text-ink-900">Change password</h3>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
          <Button type="submit" disabled={savingPw}>
            {savingPw ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
