"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NavigationItemIcon } from "@/components/layout/app-nav";
import { MenuIcon } from "@/components/ui/icons";
import { useMenuKeyboard } from "@/components/ui/use-menu-keyboard";
import { getPrimaryNavigationItems, type NavigationItem } from "@/lib/navigation/dashboard-navigation";
import type { Role } from "@/lib/auth/session";

const shortLabels: Partial<Record<NavigationItem, string>> = {
  Dashboard: "Home",
  "Credit Management": "Credits",
  "Transaction History": "History",
};

export function MobileBottomNavigation({ activeItem, onItemChange, role }: {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  role: Role;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const items = getPrimaryNavigationItems(role);
  const primaryItems = items.length <= 3 ? items : items.slice(0, 2);
  const moreItems = items.slice(primaryItems.length);
  const isMoreActive = moreItems.includes(activeItem);
  const handleMenuKeyDown = useMenuKeyboard({
    isOpen, menuRef, triggerRef, onClose: () => setIsOpen(false),
  });

  useEffect(() => {
    if (!isOpen) return;
    function closeOutside(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);

  function navigate(item: NavigationItem) {
    setIsOpen(false);
    if (moreItems.includes(item)) triggerRef.current?.focus();
    onItemChange(item);
  }

  const buttonClass = (active: boolean) =>
    `inline-flex h-12 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand motion-reduce:transition-none ${active ? "bg-brand-soft text-brand-ink" : "text-text-muted hover:bg-panel-soft hover:text-text-control"}`;

  return (
    <nav aria-label="Mobile navigation" ref={navigationRef}
      className="flex min-w-0 flex-1 items-center gap-1 py-1 lg:hidden">
      {moreItems.length > 0 && <>
        <button type="button" aria-label="More pages" title="More pages"
          aria-expanded={isOpen} aria-controls={isOpen ? menuId : undefined} aria-haspopup="menu"
          ref={triggerRef} onClick={() => setIsOpen((open) => !open)}
          className={buttonClass(isMoreActive || isOpen)}>
          <MenuIcon className="h-5 w-5" />
          <span className="text-[0.625rem] font-medium leading-3">More</span>
        </button>
        {isOpen && <div id={menuId} ref={menuRef} role="menu" aria-label="More pages"
          onKeyDown={handleMenuKeyDown}
          className="motion-pop fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg">
          {moreItems.map((item) => <button key={item} type="button" role="menuitem"
            aria-current={activeItem === item ? "page" : undefined}
            onClick={() => navigate(item)}
            className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${activeItem === item ? "bg-brand-soft text-brand-ink" : "text-text-control hover:bg-panel-soft"}`}>
            <NavigationItemIcon item={item} className="h-5 w-5 shrink-0" />
            {item}
          </button>)}
        </div>}
      </>}
      {[...primaryItems].reverse().map((item) => (
        <button key={item} type="button" aria-label={item} title={item}
          aria-current={activeItem === item ? "page" : undefined}
          onClick={() => navigate(item)} className={buttonClass(activeItem === item)}>
          <NavigationItemIcon item={item} className="h-5 w-5" />
          <span className="text-[0.625rem] font-medium leading-3">{shortLabels[item] ?? item}</span>
        </button>
      ))}
    </nav>
  );
}
