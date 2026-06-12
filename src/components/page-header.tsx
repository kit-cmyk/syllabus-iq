export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] font-bold text-ink-900 leading-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}
