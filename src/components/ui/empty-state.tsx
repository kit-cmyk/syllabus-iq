import { IconBubble } from "./icon-bubble";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <IconBubble size="lg">{icon}</IconBubble>
      <h3 className="mt-4 text-[17px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-[15px] text-ink-600 max-w-sm">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
