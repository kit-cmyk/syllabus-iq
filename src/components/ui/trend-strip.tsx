import { cn } from "@/lib/cn";

/** Last-N attempts as green/rose dots, oldest → newest left to right. */
export function TrendStrip({
  results,
  className,
}: {
  results: boolean[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {results.map((ok, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full",
            ok ? "bg-mastered" : "bg-learning"
          )}
        />
      ))}
    </div>
  );
}
