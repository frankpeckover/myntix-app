"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FilterIcon } from "@/components/ui/icons";

type TableHeaderFilterProps = {
  children: ReactNode;
  isActive?: boolean;
  label: string;
  onClear?: () => void;
};

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
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
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

      {isOpen && (
        <div
          aria-label={`Filter ${label}`}
          className="motion-pop absolute left-0 top-8 z-[130] min-w-56 rounded-md border border-border bg-surface p-3 text-sm normal-case tracking-normal shadow-lg"
          id={panelId}
          ref={filterPanelRef}
          role="dialog"
        >
          {children}
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
        </div>
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
  return (
    <label className="block text-xs font-normal text-text-muted">
      <span>{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal text-text-control outline-none ring-brand transition focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
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
