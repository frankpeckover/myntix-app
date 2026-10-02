import type { ReactNode } from "react";

type AdminPageSectionProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  isFlush?: boolean;
};

export function AdminPageSection({
  ariaLabel,
  children,
  className = "",
  isFlush = false,
}: AdminPageSectionProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={`admin-page-section theme-panel motion-panel mt-3 min-w-0 sm:mt-5 ${
        isFlush ? "p-0" : "p-3 sm:p-5"
      } ${className}`}
    >
      {children}
    </section>
  );
}
