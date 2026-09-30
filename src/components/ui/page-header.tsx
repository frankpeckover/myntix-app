import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  icon?: ReactNode;
  iconTone?: "accent" | "brand" | "neutral";
  kicker?: string;
  title: string;
  titleSize?: "base" | "large";
};

export function PageHeader({
  actions,
  description,
  icon,
  iconTone = "brand",
  kicker,
  title,
  titleSize = "large",
}: PageHeaderProps) {
  const titleClassName =
    titleSize === "large"
      ? "page-title-large truncate text-2xl font-semibold leading-tight sm:text-[1.7rem]"
      : "page-title-compact truncate text-base font-semibold leading-snug";

  return (
    <div className={`page-header flex min-w-0 items-start justify-between ${titleSize === "large" ? "gap-4" : "gap-3"}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${getIconToneClassName(iconTone)}`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 overflow-hidden">
          {kicker && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
              {kicker}
            </p>
          )}
          <h2 className={titleClassName}>{title}</h2>
          {description && (
            <p className={`${titleSize === "large" ? "mt-1.5 max-w-3xl" : "mt-1"} text-sm text-text-muted`}>{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="page-header-actions flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

function getIconToneClassName(tone: "accent" | "brand" | "neutral") {
  if (tone === "accent") {
    return "border-border-subtle bg-accent-soft text-accent";
  }

  if (tone === "neutral") {
    return "border-border-subtle bg-panel-soft text-text-muted";
  }

  return "border-border-subtle bg-brand-soft text-brand";
}
