import type { ReactNode } from "react";

export type MetricTone = "accent" | "brand" | "neutral" | "success";

type MetricCardProps = {
  icon?: ReactNode;
  label: string;
  tone?: MetricTone;
  value: string;
  variant?: "centered" | "value-first";
};

export function MetricCard({
  icon,
  label,
  tone = "neutral",
  value,
  variant = "value-first",
}: MetricCardProps) {
  if (variant === "centered") {
    return (
      <article className="metric-card theme-card flex min-h-24 flex-col p-4">
        <MetricCardHeader icon={icon} label={label} tone={tone} />
        <div className="flex flex-1 items-center justify-center text-center">
          <p className="text-3xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="metric-card theme-card flex min-h-32 min-w-0 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-kicker">
          {label}
        </p>
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${getMetricToneClassName(tone)}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-auto pt-5">
        <div className="min-w-0">
          <p className="break-words text-2xl font-semibold leading-none text-foreground sm:text-[1.75rem]">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function MetricCardHeader({
  icon,
  label,
  tone,
}: {
  icon?: ReactNode;
  label: string;
  tone: MetricTone;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${getMetricToneClassName(tone)}`}
        >
          {icon}
        </span>
      )}
      <p className="truncate text-xs font-semibold uppercase text-text-muted">
        {label}
      </p>
    </div>
  );
}

function getMetricToneClassName(tone: MetricTone) {
  if (tone === "accent") {
    return "bg-accent-soft text-accent";
  }

  if (tone === "success") {
    return "bg-success-soft text-success";
  }

  if (tone === "neutral") {
    return "bg-panel-soft text-text-muted";
  }

  return "bg-brand-soft text-brand";
}
