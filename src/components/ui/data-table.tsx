"use client";

import type { MouseEvent, ReactNode } from "react";
import { RowSelectionCheckbox } from "@/components/ui/bulk-selection-controls";

type DataTableProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  layout?: "auto" | "fixed";
  responsive?: "always" | "desktop";
};

const selectionAnchors = new Map<string, string>();

export function DataTable({
  ariaLabel,
  children,
  className = "",
  layout = "fixed",
  responsive = "always",
}: DataTableProps) {
  return (
    <table
      aria-label={ariaLabel}
      data-layout={layout}
      className={`app-data-table w-full border-collapse text-left text-sm ${
        layout === "fixed" ? "table-fixed" : "table-auto"
      } ${responsive === "desktop" ? "hidden md:table" : ""} ${className}`}
      onMouseOver={showOverflowTooltip}
    >
      {children}
    </table>
  );
}

function showOverflowTooltip(event: MouseEvent<HTMLTableElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("button, a, input, select, textarea")) return;

  const cell = target.closest<HTMLElement>("th, td");
  if (!cell || !event.currentTarget.contains(cell)) return;
  if (cell.classList.contains("text-right")) return;

  const descendants = Array.from(cell.querySelectorAll<HTMLElement>("*"));
  const hasOverflow =
    cell.scrollWidth > cell.clientWidth ||
    cell.scrollHeight > cell.clientHeight ||
    descendants.some(
      (element) =>
        element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight,
    );

  if (!hasOverflow) return;
  const fullText = cell.textContent?.replace(/\s+/g, " ").trim();
  if (fullText) cell.title = fullText;
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={className}>{children}</tr>;
}

export function DataTableHeaderCell({
  actions = false,
  children,
  className = "",
}: {
  actions?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`py-3 font-semibold ${actions ? "text-right" : "pr-4"} ${className}`}
      scope="col"
    >
      {actions && !children ? <span className="sr-only">Actions</span> : children}
    </th>
  );
}

export function DataTableCell({
  actions = false,
  children,
  className = "",
}: {
  actions?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-3 ${actions ? "text-right" : "pr-4"} ${className}`}>
      {children}
    </td>
  );
}

export function DataTableCurrencyValue({
  amount,
  currencyName,
}: {
  amount: ReactNode;
  currencyName: string;
}) {
  return (
    <span className="inline-flex flex-col items-end leading-none">
      <span className="font-number text-sm font-semibold text-foreground">
        {amount}
      </span>
      <span className="mt-1 text-[0.68rem] font-normal text-text-subtle">
        {currencyName}
      </span>
    </span>
  );
}

export function DataTableSelectionHeader({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <DataTableHeaderCell className="w-10 pr-3">
      <RowSelectionCheckbox checked={checked} label={label} onChange={onChange} />
    </DataTableHeaderCell>
  );
}

export function DataTableSelectionCell({
  checked,
  disabled = false,
  label,
  onChange,
  onRangeChange,
  rangeKey,
  rowId,
  selectableRowIds,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  onRangeChange?: (rowIds: string[], checked: boolean) => void;
  rangeKey?: string;
  rowId?: string;
  selectableRowIds?: string[];
}) {
  return (
    <DataTableCell className="table-selection-cell w-10 pr-3">
      <RowSelectionCheckbox
        checked={checked}
        disabled={disabled}
        label={label}
        onChange={(isSelected, shiftKey) => {
          if (shiftKey && rangeKey && rowId && selectableRowIds && onRangeChange) {
            const anchorId = selectionAnchors.get(rangeKey);
            const anchorIndex = anchorId ? selectableRowIds.indexOf(anchorId) : -1;
            const rowIndex = selectableRowIds.indexOf(rowId);
            if (anchorIndex >= 0 && rowIndex >= 0) {
              const start = Math.min(anchorIndex, rowIndex);
              const end = Math.max(anchorIndex, rowIndex);
              onRangeChange(selectableRowIds.slice(start, end + 1), isSelected);
              return;
            }
          }

          if (rangeKey && rowId) selectionAnchors.set(rangeKey, rowId);
          onChange(isSelected);
        }}
      />
    </DataTableCell>
  );
}
