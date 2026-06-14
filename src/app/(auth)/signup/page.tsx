"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { IconBubble } from "@/components/ui/icon-bubble";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const examDate = String(form.get("exam_date") || "");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(form.get("password")),
      options: {
        // exam_date rides along in user metadata; it's seeded into user_stats
        // on first authenticated load (auth callback, or here when confirmation is off).
        data: { full_name: String(form.get("name")), exam_date: examDate || null },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is off, a session exists and we can go straight in.
    if (data.session) {
      if (examDate && data.user) {
        await supabase
          .from("user_stats")
          .upsert({ user_id: data.user.id, exam_date: examDate }, { onConflict: "user_id" });
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setCheckEmail(email);
    setLoading(false);
  }

  async function resend() {
    setResent(false);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: checkEmail!,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (!error) setResent(true);
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <IconBubble size="lg" className="bg-mastered-bg text-mastered">
          <MailCheck size={28} strokeWidth={1.75} />
        </IconBubble>
        <h1 className="mt-4 text-[24px] font-bold text-ink-900">Check your email</h1>
        <p className="mt-2 text-[15px]">
          We sent a confirmation link to <strong>{checkEmail}</strong>. Click it
          to activate your account, then sign in.
        </p>
        <button
          type="button"
          onClick={resend}
          className="mt-4 text-[14px] font-semibold text-brand hover:underline"
        >
          {resent ? "Sent — check again in a minute" : "Resend the email"}
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[28px] font-bold text-ink-900">
        Start your review, <span className="text-brand-gradient">free</span>
      </h1>
      <p className="mt-1 text-[15px]">
        Track all 6 subjects and 69 syllabus topics from day one.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required placeholder="Juan dela Cruz" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="exam_date">Target exam date (optional)</Label>
          <Input id="exam_date" name="exam_date" type="date" />
          <p className="mt-1.5 text-[12px] text-ink-400">
            We&apos;ll show a countdown and pace your review toward it. You can change it later.
          </p>
        </div>
        {error && (
          <p className="rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-[12px] text-ink-400">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="font-medium text-brand">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-brand">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-[15px]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </>
  );
}
