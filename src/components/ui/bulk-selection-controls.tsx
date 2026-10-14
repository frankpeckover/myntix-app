import { useOptimistic, useRef, useTransition, type ReactNode } from "react";
import {
  type TableActionMenuItem,
} from "@/components/ui/table-action-menu";
import { IconButton } from "@/components/ui/icon-button";

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
  const [, startTransition] = useTransition();
  const [optimisticAllSelected, setOptimisticAllSelected] = useOptimistic(
    isAllSelected,
    (_current, next: boolean) => next,
  );

  if (!onVisibleSelectionChange && selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onVisibleSelectionChange && (
        <div className="flex items-center gap-2 md:hidden">
          <RowSelectionCheckbox
            checked={optimisticAllSelected}
            label={allSelectedLabel}
            onChange={(nextSelected) => {
              startTransition(() => {
                setOptimisticAllSelected(nextSelected);
                onVisibleSelectionChange(nextSelected);
              });
            }}
          />
          <span className="text-xs text-text-muted">Select all</span>
        </div>
      )}
      {selectedCount > 0 && (
        <>
      <span className="text-xs text-text-muted">
        {selectedCount} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <IconButton
            disabled={action.disabled}
            key={action.label}
            label={action.label}
            onClick={action.onSelect}
            text={action.label}
            tone={action.tone ?? "default"}
          >
            {action.icon}
          </IconButton>
        ))}
      </div>
        </>
      )}
    </div>
  );
}

type RowSelectionCheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean, shiftKey: boolean) => void;
};

export function RowSelectionCheckbox({
  checked,
  disabled = false,
  label,
  onChange,
}: RowSelectionCheckboxProps) {
  const shiftKeyRef = useRef(false);

  return (
    <input
      aria-label={label}
      checked={checked}
      className="h-4 w-4 shrink-0 rounded-sm border border-border-strong bg-surface accent-[var(--color-brand)]"
      disabled={disabled}
      onClick={(event) => {
        shiftKeyRef.current = event.shiftKey;
      }}
      onKeyDown={(event) => {
        shiftKeyRef.current = event.shiftKey;
      }}
      onChange={(event) => {
        onChange(event.target.checked, shiftKeyRef.current);
        shiftKeyRef.current = false;
      }}
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
