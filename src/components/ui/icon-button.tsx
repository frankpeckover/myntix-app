import type { ReactNode } from "react";

type IconButtonTone = "default" | "danger" | "primary";

type IconButtonProps = {
  ariaExpanded?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  text?: string;
  tone?: IconButtonTone;
};

const toneClassNames: Record<IconButtonTone, string> = {
  danger:
    "border-danger-button-border bg-surface text-danger-strong hover:bg-danger-soft",
  default: "border-button-border bg-surface text-text-control hover:border-border-strong hover:bg-panel-soft",
  primary:
    "border-brand bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow",
};

export function IconButton({
  ariaExpanded,
  children,
  disabled = false,
  label,
  onClick,
  text,
  tone = "default",
}: IconButtonProps) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={label}
      className={`ui-icon-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        text ? "w-10 sm:w-auto sm:px-3.5" : "w-10"
      } ${toneClassNames[tone]}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
      {text && <span className="hidden sm:inline">{text}</span>}
    </button>
  );
}
