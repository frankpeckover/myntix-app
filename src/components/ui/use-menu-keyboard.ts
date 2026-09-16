"use client";

import { useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
} from "react";

const menuItemSelector = '[role="menuitem"]:not([disabled])';

export function useMenuKeyboard({
  isOpen,
  menuRef,
  onClose,
  triggerRef,
}: {
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      getMenuItems(menuRef.current)[0]?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen, menuRef]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = getMenuItems(menuRef.current);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCloseRef.current();
      triggerRef.current?.focus();
      return;
    } else if (event.key === "Tab") {
      onCloseRef.current();
      return;
    }

    if (nextIndex !== null && items[nextIndex]) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  }

  return handleMenuKeyDown;
}

function getMenuItems(menu: HTMLDivElement | null) {
  return menu
    ? Array.from(menu.querySelectorAll<HTMLButtonElement>(menuItemSelector))
    : [];
}
