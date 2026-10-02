"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { FilterIcon } from "@/components/ui/icons";

type TableHeaderFilterProps = {
  children: ReactNode;
  isActive?: boolean;
  label: string;
  onClear?: () => void;
};

const TableFilterCloseContext = createContext<() => void>(() => undefined);

export function TableHeaderFilter({
  children,
  isActive = false,
  label,
  onClear,
}: TableHeaderFilterProps) {
  const filterRef = useRef<HTMLDivElement | null>(null);
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
        !filterRef.current?.contains(event.target as Node) &&
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
    <div className="relative inline-flex items-center gap-1.5" ref={filterRef}>
      <span>{label}</span>
      <button
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-haspopup="dialog"
        aria-label={`Filter ${label}`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition ${
          isActive
            ? "bg-brand-soft text-brand-ink"
            : "text-text-muted hover:bg-panel-soft hover:text-text-control"
        }`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <FilterIcon className="h-3.5 w-3.5" />
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
            {children}
          </TableFilterCloseContext.Provider>
          {onClear && (
            <button
              className="mt-3 w-full rounded-md border border-button-border px-3 py-2 text-sm font-normal text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isActive}
              onClick={onClear}
              type="button"
            >
              Clear
            </button>
          )}
        </div>,
        document.body,
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
  type?: "number" | "text";
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
