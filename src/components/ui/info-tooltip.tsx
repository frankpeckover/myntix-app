"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const width = tooltipRef.current?.offsetWidth ?? tooltipWidth;
      const height = tooltipRef.current?.offsetHeight ?? 80;
      const preferredLeft =
        align === "end" ? rect.right - width : rect.left;
      const maximumLeft = window.innerWidth - width - tooltipViewportPadding;
      const spaceBelow = window.innerHeight - rect.bottom - tooltipOffset - tooltipViewportPadding;
      const preferredTop = spaceBelow >= height || spaceBelow >= rect.top - tooltipViewportPadding
        ? rect.bottom + tooltipOffset : rect.top - tooltipOffset - height;

      setPosition({
        left: Math.max(tooltipViewportPadding, Math.min(preferredLeft, maximumLeft)),
        top: Math.max(tooltipViewportPadding, Math.min(preferredTop, window.innerHeight - height - tooltipViewportPadding)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = new ResizeObserver(updatePosition);
    if (tooltipRef.current) observer.observe(tooltipRef.current);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer.disconnect();
    };
  }, [align, isOpen, label]);

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
        aria-label="More information"
        aria-describedby={isOpen ? tooltipId : undefined}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition hover:text-text-control focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
          }
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => {
          if (document.activeElement !== triggerRef.current) setIsOpen(false);
        }}
        ref={triggerRef}
        type="button"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {isOpen &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[1000] w-64 max-w-[calc(100vw-24px)] rounded-md bg-text-control px-3 py-2 text-xs font-medium leading-5 text-surface shadow-lg"
            id={tooltipId}
            ref={tooltipRef}
            role="tooltip"
            style={position ?? { left: tooltipViewportPadding, top: tooltipViewportPadding, visibility: "hidden" }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
