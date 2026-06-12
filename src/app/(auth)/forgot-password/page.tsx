"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { IconBubble } from "@/components/ui/icon-bubble";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSentTo(email);
    setLoading(false);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <IconBubble size="lg" className="bg-mastered-bg text-mastered">
          <MailCheck size={28} strokeWidth={1.75} />
        </IconBubble>
        <h1 className="mt-4 text-[24px] font-bold text-ink-900">Check your email</h1>
        <p className="mt-2 text-[15px]">
          If an account exists for <strong>{sentTo}</strong>, we sent a link to
          reset your password.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[28px] font-bold text-ink-900">Reset your password</h1>
      <p className="mt-1 text-[15px]">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        {error && (
          <p className="rounded-[var(--radius-control)] bg-learning-bg px-4 py-3 text-[13px] font-medium text-learning">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-[15px]">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
