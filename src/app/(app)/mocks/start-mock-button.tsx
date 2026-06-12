"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createMock } from "./actions";

export function StartMockButton({
  subjectId,
  code,
}: {
  subjectId: string;
  code: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await createMock(subjectId);
            if (r && "error" in r) setError(r.error);
          });
        }}
      >
        {pending ? "Building your paper…" : `Start ${code} mock`}
      </Button>
      {error && (
        <p className="mt-2 rounded-[var(--radius-control)] bg-learning-bg px-3 py-2 text-[12px] font-medium text-learning">
          {error}
        </p>
      )}
    </>
  );
}
