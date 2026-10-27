"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const PageResultCountTargetContext = createContext<HTMLDivElement | null>(null);
export const MobileResultCountContext = createContext(false);

export function PageResultCount({ children, mobile = false }: {
  children: ReactNode;
  mobile?: boolean;
}) {
  const target = useContext(PageResultCountTargetContext);
  const isMobileToolbar = useContext(MobileResultCountContext);

  if ((mobile || isMobileToolbar) && target) {
    return createPortal(
      <p className="mt-1 text-xs leading-5 text-text-muted">{children}</p>,
      target,
    );
  }

  return <p className="text-sm font-semibold text-text-muted">{children}</p>;
}
