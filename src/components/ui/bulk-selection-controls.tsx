import { useRef } from "react";
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
  if (!onVisibleSelectionChange && selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onVisibleSelectionChange && (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md pr-2 text-text-muted hover:text-text-control md:hidden">
          <RowSelectionCheckbox
            checked={isAllSelected}
            label={allSelectedLabel}
            onChange={onVisibleSelectionChange}
          />
          <span className="text-xs text-text-muted">Select all</span>
        </label>
      )}
      {selectedCount > 0 && (
        <>
      <span className="text-xs text-text-muted" role="status" aria-live="polite" aria-atomic="true">
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
