"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { useMenuKeyboard } from "@/components/ui/use-menu-keyboard";

type InlineSelectOption<TValue extends number | string> = {
  label: string;
  value: TValue;
};

type InlineSelectMenuProps<TValue extends number | string> = {
  ariaLabel: string;
  onChange: (value: TValue) => void;
  options: readonly InlineSelectOption<TValue>[];
  value: TValue;
};

export function InlineSelectMenu<TValue extends number | string>({
  ariaLabel,
  onChange,
  options,
  value,
}: InlineSelectMenuProps<TValue>) {
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
  const selectedOption = options.find((option) => option.value === value);

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

  return (
    <div
      className={`relative inline-flex ${isOpen ? "z-[160]" : "z-0"}`}
      ref={menuRef}
    >
      <button
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="inline-flex h-[46px] items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text-control transition hover:bg-panel-soft hover:text-foreground"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <span>{selectedOption?.label ?? "Select"}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-text-muted" />
      </button>

      {isOpen && (
        <div
          aria-label={ariaLabel}
          className="motion-pop absolute right-0 top-10 z-[170] min-w-32 rounded-md border border-border bg-surface p-1.5 text-sm shadow-lg"
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          ref={popupRef}
          role="menu"
        >
          {options.map((option) => (
            <button
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-text-control transition hover:bg-panel-soft"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && (
                <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
