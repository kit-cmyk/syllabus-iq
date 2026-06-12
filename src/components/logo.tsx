import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-white shadow-card">
        <BookOpenCheck size={20} strokeWidth={1.75} />
      </span>
      <span className="text-[20px] font-bold text-ink-900">SyllabusIQ</span>
    </Link>
  );
}
