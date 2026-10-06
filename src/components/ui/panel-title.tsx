import type { ReactNode } from "react";

type PanelTitleProps = {
  accessory?: ReactNode;
  className?: string;
  title: string;
};

export function PanelTitle({
  accessory,
  className = "",
  title,
}: PanelTitleProps) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <h2 className="min-w-0 truncate text-base font-semibold leading-snug text-foreground">
        {title}
      </h2>
      {accessory}
    </div>
  );
}
