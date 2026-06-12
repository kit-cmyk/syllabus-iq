"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createReviewSession } from "./actions";

export function StartReviewButton({ dueCount }: { dueCount: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="text-right">
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await createReviewSession();
            if (r && "error" in r) setError(r.error);
          });
        }}
      >
        {pending
          ? "Building your queue…"
          : dueCount > 0
            ? `Start review (${dueCount})`
            : "Start refresher session"}
      </Button>
      {error && (
        <p className="mt-2 rounded-[var(--radius-control)] bg-learning-bg px-3 py-2 text-[12px] font-medium text-learning">
          {error}
        </p>
      )}
    </div>
  );
}
