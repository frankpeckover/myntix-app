"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

export function MobileDisclosure({ children, icon, title }: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <details
      className="group/mobile-disclosure space-y-2"
      onToggle={(event) => {
        if (event.currentTarget.open) setHasOpened(true);
      }}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm font-semibold text-text-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="text-brand" aria-hidden="true">{icon}</span>
          {title}
        </span>
        <ChevronDownIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open/mobile-disclosure:rotate-180 motion-reduce:transition-none" />
      </summary>
      {/* Defer secondary fetches until opened, then retain form state on collapse. */}
      {hasOpened && children}
    </details>
  );
}
