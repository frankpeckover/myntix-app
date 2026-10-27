"use client";

import type { ReactNode } from "react";

export type MobileSelectionProps = {
  selected?: boolean;
  selectionLabel?: string;
  onSelectionChange?: (selected: boolean) => void;
};

export function MobileSelectionSurface({
  as: Element = "div", children, className = "", selected = false,
  selectionLabel = "Select row", onSelectionChange,
}: MobileSelectionProps & {
  as?: "article" | "div";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Element
      className={`relative min-w-0 ${className} ${onSelectionChange ? "cursor-pointer focus-within:ring-2 focus-within:ring-brand" : ""} ${selected ? "ring-1 ring-brand" : ""}`}
      data-selected={selected || undefined}
      style={selected ? { backgroundColor: "var(--brand-soft)" } : undefined}
      onClick={onSelectionChange ? (event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, a, input, select, textarea, label, summary, [role='menu'], [role='button'], [contenteditable='true']")) return;
        onSelectionChange(!selected);
      } : undefined}
    >
      {onSelectionChange && (
        // Retain native keyboard/screen-reader selection without a visible checkbox.
        <input type="checkbox" className="sr-only" aria-label={selectionLabel}
          checked={selected} onChange={(event) => onSelectionChange(event.target.checked)} />
      )}
      {selected && <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r bg-brand" />}
      {children}
    </Element>
  );
}
