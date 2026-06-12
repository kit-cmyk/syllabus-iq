import { cn } from "@/lib/cn";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[13px] font-medium text-ink-600 mb-1.5", className)}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[var(--radius-control)] border border-line bg-card px-4 text-[15px] text-ink-900",
        "placeholder:text-ink-400 outline-none transition-shadow duration-150",
        "focus:border-brand focus:ring-2 focus:ring-brand/30",
        className
      )}
      {...props}
    />
  );
}
