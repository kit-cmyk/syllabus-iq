import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-[var(--radius-card)] p-6 shadow-card",
        interactive &&
          "transition-all duration-150 ease-out hover:shadow-float hover:-translate-y-0.5 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
