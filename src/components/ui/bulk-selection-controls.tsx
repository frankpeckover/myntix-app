import type { ReactNode } from "react";
import {
  TableActionMenu,
  type TableActionMenuItem,
} from "@/components/ui/table-action-menu";

type BulkSelectionControlsProps = {
  actions: TableActionMenuItem[];
  allSelectedLabel?: string;
  isAllSelected?: boolean;
  onVisibleSelectionChange?: (isSelected: boolean) => void;
  selectedCount: number;
};

export function BulkSelectionControls({
  actions,
  allSelectedLabel = "Select all",
  isAllSelected = false,
  onVisibleSelectionChange,
  selectedCount,
}: BulkSelectionControlsProps) {
  if (!onVisibleSelectionChange && selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onVisibleSelectionChange && (
        <div className="flex items-center gap-2 md:hidden">
          <RowSelectionCheckbox
            checked={isAllSelected}
            label={allSelectedLabel}
            onChange={onVisibleSelectionChange}
          />
          <span className="text-xs text-text-muted">Select all</span>
        </div>
      )}
      {selectedCount > 0 && (
        <>
      <span className="text-xs text-text-muted">
        {selectedCount} selected
      </span>
      <TableActionMenu
        items={actions}
        label="Open bulk actions"
      />
        </>
      )}
    </div>
  );
}

type RowSelectionCheckboxProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function RowSelectionCheckbox({
  checked,
  label,
  onChange,
}: RowSelectionCheckboxProps) {
  return (
    <input
      aria-label={label}
      checked={checked}
      className="h-4 w-4 shrink-0 rounded-sm border border-border-strong bg-surface accent-[var(--color-brand)]"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
  );
}

export function MobileSelectionShell({
  checkbox,
  children,
}: {
  checkbox: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-start gap-2 sm:gap-3">
      <div className="pt-1">{checkbox}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
