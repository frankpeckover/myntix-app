"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

type ModalShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  onClose?: () => void;
  title: string;
};

export function ModalShell({
  actions,
  children,
  description,
  footer,
  maxWidthClassName = "max-w-2xl",
  onClose,
  title,
}: ModalShellProps) {
  const dialogRef = useDialogFocus({ onEscape: onClose });
  const descriptionId = useId();
  const titleId = useId();

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`app-modal theme-panel motion-pop min-w-0 max-h-full w-full ${maxWidthClassName} overflow-x-hidden overflow-y-auto p-5 shadow-lg`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold" id={titleId}>{title}</h3>
            {description && (
              <div className="mt-1 break-words text-sm text-text-muted" id={descriptionId}>{description}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {onClose && <ModalCloseButton onClick={onClose} />}
          </div>
        </div>

        <div className="app-modal-body">{children}</div>

        {footer && (
          <div className="app-modal-footer flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
