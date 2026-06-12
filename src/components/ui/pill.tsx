import { cn } from "@/lib/cn";

/** Lavender pill badge — the "Rated #1" pattern from the brand reference. */
export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-[13px] font-medium text-brand",
        className
      )}
    >
      {children}
    </span>
  );
}
