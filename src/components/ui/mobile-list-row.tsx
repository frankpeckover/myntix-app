import type { ReactNode } from "react";
import { MobileSelectionSurface, type MobileSelectionProps } from "@/components/ui/mobile-selection-surface";

export function MobileListRow({ children, value, actions, leading, footer, selected = false, selectionLabel, onSelectionChange }: MobileSelectionProps & {
  children: ReactNode;
  value?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <MobileSelectionSurface as="article" className="theme-card w-full min-w-0 p-3"
      selected={selected} selectionLabel={selectionLabel} onSelectionChange={onSelectionChange}>
      <div className={`grid min-w-0 items-center gap-2 ${leading ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"}`}>
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 break-words">{children}</div>
        <div className="shrink-0 text-right">{value}</div>
        <div className="shrink-0">{actions}</div>
      </div>
      {footer}
    </MobileSelectionSurface>
  );
}
