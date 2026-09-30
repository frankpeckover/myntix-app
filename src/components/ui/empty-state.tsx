import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="empty-state min-w-0 px-5 py-9 text-center sm:py-11">
      {icon && (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-panel-soft text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md break-words text-sm leading-relaxed text-text-muted [overflow-wrap:anywhere]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
