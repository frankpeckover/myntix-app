export type StatusTone = "danger" | "neutral" | "success" | "warning";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold leading-none ${getToneClasses(tone)}`}
    >
      {label}
    </span>
  );
}

function getToneClasses(tone: StatusTone) {
  if (tone === "danger") {
    return "border-danger-border bg-danger-soft text-danger-strong";
  }

  if (tone === "success") {
    return "border-success-border bg-success-soft text-success";
  }

  if (tone === "warning") {
    return "border-warning-border bg-warning-soft text-warning";
  }

  return "border-border bg-chip-bg text-chip-text";
}
