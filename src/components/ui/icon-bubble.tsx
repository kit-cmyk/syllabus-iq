import { cn } from "@/lib/cn";

/** Tinted circle with a colored icon — the floating-card icon pattern from the reference. */
export function IconBubble({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-tint text-brand shrink-0",
        size === "md" ? "size-11" : "size-16",
        className
      )}
    >
      {children}
    </span>
  );
}
