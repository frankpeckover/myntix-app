"use client";

import type { ReactNode } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type CreditActionControlProps = {
  addAriaLabel?: string;
  addLabel?: string;
  amountLabels?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
  removeLabel?: string;
};

export function CreditActionControl({
  addAriaLabel,
  addLabel = "Add",
  amountLabels = false,
  onAdd,
  onRemove,
  removeAriaLabel,
  removeLabel = "Remove",
}: CreditActionControlProps) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface shadow-sm">
      <CreditActionButton
        ariaLabel={addAriaLabel ?? addLabel}
        isAmountLabel={amountLabels}
        label={addLabel}
        onClick={onAdd}
        tone="positive"
      >
        {!amountLabels && <PlusIcon className="h-3.5 w-3.5 shrink-0" />}
      </CreditActionButton>
      <span className="w-px bg-border-subtle" />
      <CreditActionButton
        ariaLabel={removeAriaLabel ?? removeLabel}
        isAmountLabel={amountLabels}
        label={removeLabel}
        onClick={onRemove}
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
  tone,
}: {
  ariaLabel: string;
  children: ReactNode;
  isAmountLabel: boolean;
  label: string;
  onClick?: () => void;
  tone: "negative" | "positive";
}) {
  const toneClassName =
    tone === "positive"
      ? "text-success hover:bg-success-fill hover:text-white"
      : "text-danger hover:bg-danger hover:text-white";
  const displayLabel = isAmountLabel
    ? `${tone === "positive" ? "+" : "-"}${label}`
    : label;

  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 px-2 text-xs font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 ${toneClassName}`}
      disabled={!onClick}
      onClick={onClick}
      title={ariaLabel}
      type="button"
    >
      {children}
      <span
        className={`items-center leading-none ${
          isAmountLabel
            ? "inline-flex font-number text-sm tabular-nums"
            : "hidden sm:inline-flex"
        }`}
      >
        {displayLabel}
      </span>
    </button>
  );
}
