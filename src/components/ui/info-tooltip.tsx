"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "@/components/ui/icons";

type InfoTooltipProps = {
  align?: "end" | "start";
  label: string;
};

type TooltipPosition = {
  left: number;
  top: number;
};

const tooltipOffset = 8;
const tooltipViewportPadding = 12;
const tooltipWidth = 256;

export function InfoTooltip({
  align = "start",
  label,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const preferredLeft =
        align === "end" ? rect.right - tooltipWidth : rect.left;
      const maximumLeft = window.innerWidth - tooltipWidth - tooltipViewportPadding;

      setPosition({
        left: Math.max(tooltipViewportPadding, Math.min(preferredLeft, maximumLeft)),
        top: rect.bottom + tooltipOffset,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeWhenClickingAway(event: PointerEvent) {
      if (!triggerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeWhenClickingAway);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenClickingAway);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span className="inline-flex shrink-0">
      <button
        aria-expanded={isOpen}
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition hover:text-text-control focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setIsOpen((current) => !current)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
        type="button"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {isOpen &&
        position &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[100] w-64 rounded-md bg-text-control px-3 py-2 text-xs font-medium leading-5 text-surface shadow-lg"
            role="tooltip"
            style={position}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
