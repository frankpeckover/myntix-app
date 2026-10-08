import type { ReactNode } from "react";

export function PreferencesSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="theme-panel min-w-0 p-4 sm:p-5">
      <header className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-panel-soft text-text-muted">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-control">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-text-muted">{description}</p>
        </div>
      </header>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}
