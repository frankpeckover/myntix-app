"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import type { TableSortDirection } from "@/components/ui/table-sorting";

type TableHeaderFilterProps = {
  children?: ReactNode;
  isActive?: boolean;
  label: string;
  onClear?: () => void;
  onSortDirectionChange?: (direction: TableSortDirection | null) => void;
  sortDirection?: TableSortDirection | null;
};

const TableFilterCloseContext = createContext<() => void>(() => undefined);

export function TableHeaderFilter({
  children,
  isActive = false,
  label,
  onClear,
  onSortDirectionChange,
  sortDirection = null,
}: TableHeaderFilterProps) {
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const panelId = useId();

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const gap = 8;
    const viewportPadding = 12;
    const panelWidth = filterPanelRef.current?.offsetWidth ?? 224;
    const panelHeight = filterPanelRef.current?.offsetHeight ?? 220;
    const triggerRect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - panelWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const top =
      spaceBelow >= panelHeight + gap
        ? triggerRect.bottom + gap
        : Math.max(viewportPadding, triggerRect.top - panelHeight - gap);

    setPanelPosition({ left, top });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        !triggerRef.current?.contains(event.target as Node) &&
        !filterPanelRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();
    const animationFrame = window.requestAnimationFrame(updatePanelPosition);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      filterPanelRef.current
        ?.querySelector<HTMLElement>("input, select, button")
        ?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center whitespace-nowrap">
      <button
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-haspopup="dialog"
        aria-label={`Open ${label} filter and sort options${sortDirection ? `, sorted ${sortDirection}` : ""}`}
        className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          isActive || sortDirection
            ? "text-brand-ink hover:bg-brand-soft"
            : "text-inherit hover:bg-panel-soft hover:text-text-control"
        }`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <span>{label}</span>
        {sortDirection && (
          <span aria-hidden="true" className="text-brand-ink">
            {sortDirection === "ascending" ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          aria-label={`Filter ${label}`}
          className="motion-pop fixed z-[300] min-w-56 rounded-md border border-border bg-surface p-3 text-sm normal-case tracking-normal shadow-lg"
          id={panelId}
          ref={filterPanelRef}
          role="dialog"
          style={panelPosition}
        >
          <TableFilterCloseContext.Provider value={() => setIsOpen(false)}>
            {onSortDirectionChange && (
              <TableSortControls
                direction={sortDirection}
                onChange={onSortDirectionChange}
              />
            )}
            {children}
            {onClear && (
              <button
                className="mt-3 w-full rounded-md border border-button-border px-3 py-2 text-sm font-normal text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isActive}
                onClick={onClear}
                type="button"
              >
                Clear filters
              </button>
            )}
          </TableFilterCloseContext.Provider>
        </div>,
        document.body,
      )}
    </div>
  );
}

function TableSortControls({
  direction,
  onChange,
}: {
  direction: TableSortDirection | null;
  onChange: (direction: TableSortDirection | null) => void;
}) {
  const closeFilter = useContext(TableFilterCloseContext);

  function chooseDirection(nextDirection: TableSortDirection) {
    onChange(nextDirection);
    closeFilter();
  }

  return (
    <div className="mb-3 border-b border-border-subtle pb-3">
      <p className="mb-2 text-xs font-semibold text-text-muted">Sort</p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          aria-pressed={direction === "ascending"}
          className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
            direction === "ascending"
              ? "border-brand bg-brand-soft text-brand-ink"
              : "border-button-border text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => chooseDirection("ascending")}
          type="button"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
          Ascending
        </button>
        <button
          aria-pressed={direction === "descending"}
          className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
            direction === "descending"
              ? "border-brand bg-brand-soft text-brand-ink"
              : "border-button-border text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => chooseDirection("descending")}
          type="button"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
          Descending
        </button>
      </div>
      {direction && (
        <button
          className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs text-text-muted transition hover:bg-panel-soft hover:text-text-control"
          onClick={() => {
            onChange(null);
            closeFilter();
          }}
          type="button"
        >
          Clear sort
        </button>
      )}
    </div>
  );
}

export function TableHeaderFilterInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="block text-xs font-normal text-text-muted">
      <span>{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal text-text-control outline-none ring-brand transition placeholder:text-text-muted focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "1" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

export function TableHeaderFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const closeFilter = useContext(TableFilterCloseContext);

  return (
    <label className="block text-xs font-normal text-text-muted">
      <span>{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal text-text-control outline-none ring-brand transition focus:ring-2"
        onChange={(event) => {
          onChange(event.target.value);
          closeFilter();
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || "any"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
