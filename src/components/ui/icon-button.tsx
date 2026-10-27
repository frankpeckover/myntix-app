import type { ReactNode } from "react";
import {
  type ActionTone,
  resolveActionTone,
} from "@/components/ui/action-tone";

type IconButtonProps = {
  ariaExpanded?: boolean;
  ariaControls?: string;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  text?: string;
  tone?: ActionTone;
  size?: "default" | "touch";
};

const toneClassNames: Record<ActionTone, string> = {
  danger:
    "border-danger-button-border bg-surface text-danger-strong hover:bg-danger-soft",
  default: "border-button-border bg-surface text-text-control hover:border-border-strong hover:bg-panel-soft",
  primary:
    "border-brand bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow",
  success:
    "border-positive-border bg-positive-fill text-positive-ink hover:brightness-[0.97]",
};

export function IconButton({
  ariaExpanded,
  ariaControls,
  children,
  disabled = false,
  label,
  onClick,
  text,
  tone = "default",
  size = "default",
}: IconButtonProps) {
  const resolvedTone = resolveActionTone(label, tone);

  return (
    <button
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-label={label}
      className={`ui-icon-button inline-flex ${size === "touch" ? "h-11" : "h-10"} shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        text ? `${size === "touch" ? "w-11" : "w-10"} sm:w-auto sm:px-3.5` : size === "touch" ? "w-11" : "w-10"
      } ${toneClassNames[resolvedTone]}`}
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
