"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MoreVerticalIcon } from "@/components/ui/icons";
import { useMenuKeyboard } from "@/components/ui/use-menu-keyboard";

export type TableActionMenuItem = {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger" | "primary" | "success";
};

type TableActionMenuProps = {
  items: TableActionMenuItem[];
  label?: string;
};

const itemToneClassNames: Record<
  NonNullable<TableActionMenuItem["tone"]>,
  string
> = {
  danger: "text-danger-strong hover:bg-danger-soft",
  default: "text-text-control hover:bg-panel-soft",
  primary: "text-brand-ink hover:bg-brand-soft",
  success: "text-success hover:bg-success-soft",
};

export function TableActionMenu({
  items,
  label = "Open row actions",
}: TableActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const handleMenuKeyDown = useMenuKeyboard({
    isOpen,
    menuRef: popupRef,
    onClose: () => setIsOpen(false),
    triggerRef,
  });
  const visibleItems = items.filter(Boolean);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative inline-flex justify-end ${isOpen ? "z-[160]" : "z-0"}`}
      ref={menuRef}
    >
      <button
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-haspopup="menu"
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-panel-soft hover:text-text-control"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          aria-label={label}
          className="motion-pop absolute right-0 top-9 z-[170] min-w-40 rounded-md border border-border bg-surface p-1.5 text-sm shadow-lg"
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          ref={popupRef}
          role="menu"
        >
          {visibleItems.map((item) => (
            <button
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                itemToneClassNames[item.tone ?? "default"]
              }`}
              disabled={item.disabled}
              key={item.label}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {item.icon && (
                <span className="shrink-0 text-current">{item.icon}</span>
              )}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
