"use client";

import type { ReactNode } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type CreditActionControlProps = {
  addAriaLabel?: string;
  addLabel?: string;
  amountLabels?: boolean;
  fullWidth?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
  removeLabel?: string;
  solid?: boolean;
};

export function CreditActionControl({
  addAriaLabel,
  addLabel = "Add",
  amountLabels = false,
  fullWidth = false,
  onAdd,
  onRemove,
  removeAriaLabel,
  removeLabel = "Remove",
  solid = false,
}: CreditActionControlProps) {
  return (
    <div className={`${fullWidth ? "flex w-full" : "inline-flex shrink-0"} ${solid ? "gap-2" : "overflow-hidden rounded-md border border-border-subtle bg-surface shadow-sm"}`}>
      <CreditActionButton
        ariaLabel={addAriaLabel ?? addLabel}
        isAmountLabel={amountLabels}
        label={addLabel}
        onClick={onAdd}
        solid={solid}
        tone="positive"
      >
        {!amountLabels && <PlusIcon className="h-3.5 w-3.5 shrink-0" />}
      </CreditActionButton>
      {!solid && <span className="w-px bg-border-subtle" />}
      <CreditActionButton
        ariaLabel={removeAriaLabel ?? removeLabel}
        isAmountLabel={amountLabels}
        label={removeLabel}
        onClick={onRemove}
        solid={solid}
        tone="negative"
      >
        {!amountLabels && <MinusIcon className="h-3.5 w-3.5 shrink-0" />}
      </CreditActionButton>
    </div>
  );
}

function CreditActionButton({
  ariaLabel,
  children,
  isAmountLabel,
  label,
  onClick,
  solid,
  tone,
}: {
  ariaLabel: string;
  children: ReactNode;
  isAmountLabel: boolean;
  label: string;
  onClick?: () => void;
  solid: boolean;
  tone: "negative" | "positive";
}) {
  const toneClassName = solid
    ? tone === "positive"
      ? "rounded-md bg-success-action text-white shadow-sm hover:brightness-110"
      : "rounded-md bg-danger-action text-white shadow-sm hover:brightness-110"
    : tone === "positive"
      ? "text-success hover:bg-success-fill hover:text-success-foreground"
      : "text-danger hover:bg-danger hover:text-danger-foreground";
  const displayLabel = isAmountLabel
    ? `${tone === "positive" ? "+" : "-"}${label}`
    : label;

  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex h-9 min-w-8 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 ${toneClassName}`}
      disabled={!onClick}
      onClick={onClick}
      title={ariaLabel}
      type="button"
    >
      {children}
      <span
        className={`items-center leading-none ${
          isAmountLabel
            ? "inline-flex font-number text-[15px] font-bold tabular-nums"
            : "hidden sm:inline-flex"
        }`}
      >
        {displayLabel}
      </span>
    </button>
  );
}
