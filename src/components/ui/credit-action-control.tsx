"use client";

import type { ReactNode } from "react";
import { MinusIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";

type CreditActionControlProps = {
  addAriaLabel?: string;
  addLabel?: string;
  adjustAriaLabel?: string;
  amountLabels?: boolean;
  flush?: boolean;
  fullWidth?: boolean;
  onAdd?: () => void;
  onAdjust?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
  removeLabel?: string;
  solid?: boolean;
};

export function CreditActionControl({
  addAriaLabel,
  addLabel = "Add",
  adjustAriaLabel = "Adjust credits",
  amountLabels = false,
  flush = false,
  fullWidth = false,
  onAdd,
  onAdjust,
  onRemove,
  removeAriaLabel,
  removeLabel = "Remove",
  solid = false,
}: CreditActionControlProps) {
  if (onAdjust) {
    return (
      <div
        className={`${fullWidth ? "grid w-full grid-cols-[2.75rem_1fr_2.75rem]" : "inline-grid grid-cols-[2.75rem_auto_2.75rem]"} overflow-hidden ${
          flush
            ? "border-t border-border-subtle"
            : "rounded-md border border-button-border bg-surface shadow-sm"
        }`}
      >
        <SegmentedQuickButton
          ariaLabel={removeAriaLabel ?? removeLabel}
          onClick={onRemove}
          tone="negative"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </SegmentedQuickButton>
        <button
          aria-label={adjustAriaLabel}
          className="group relative inline-flex h-10 items-center justify-center gap-2 border-x border-button-border bg-panel-soft px-3 text-xs font-semibold text-text-control transition-all duration-150 hover:z-10 hover:bg-surface-hover hover:text-foreground hover:shadow-[inset_0_0_0_2px_var(--border-strong)] focus-visible:z-10 focus-visible:bg-surface-hover focus-visible:text-foreground focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--border-strong)] active:scale-[0.97]"
          onClick={onAdjust}
          type="button"
        >
          <PencilIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110" />
          Adjust
        </button>
        <SegmentedQuickButton
          ariaLabel={addAriaLabel ?? addLabel}
          onClick={onAdd}
          tone="positive"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </SegmentedQuickButton>
      </div>
    );
  }

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

function SegmentedQuickButton({
  ariaLabel,
  children,
  onClick,
  tone,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick?: () => void;
  tone: "negative" | "positive";
}) {
  const badgeClassName =
    tone === "positive"
      ? "bg-positive-fill text-positive-ink hover:bg-positive-border hover:shadow-[inset_0_0_0_2px_var(--positive-ink)] focus-visible:bg-positive-border focus-visible:shadow-[inset_0_0_0_2px_var(--positive-ink)]"
      : "bg-negative-fill text-negative-ink hover:bg-negative-border hover:shadow-[inset_0_0_0_2px_var(--negative-ink)] focus-visible:bg-negative-border focus-visible:shadow-[inset_0_0_0_2px_var(--negative-ink)]";

  return (
    <button
      aria-label={ariaLabel}
      className={`group relative inline-flex h-10 items-center justify-center transition-all duration-150 hover:z-10 focus-visible:z-10 focus-visible:outline-none active:scale-[0.93] disabled:cursor-not-allowed disabled:opacity-50 ${badgeClassName}`}
      disabled={!onClick}
      onClick={onClick}
      title={ariaLabel}
      type="button"
    >
      <span className="transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110">
        {children}
      </span>
    </button>
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
    ? "rounded-md border border-button-border bg-surface text-text-control shadow-sm hover:border-border-strong hover:bg-panel-soft"
    : tone === "positive"
      ? "text-success hover:bg-success-fill hover:text-success-foreground"
      : "text-danger hover:bg-danger hover:text-danger-foreground";
  const badgeClassName =
    tone === "positive"
      ? "bg-positive-fill text-positive-ink"
      : "bg-negative-fill text-negative-ink";
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
            ? `inline-flex rounded px-2 py-1 font-number text-[14px] font-bold tabular-nums ${
                solid ? badgeClassName : ""
              }`
            : "hidden sm:inline-flex"
        }`}
      >
        {displayLabel}
      </span>
    </button>
  );
}
