"use client";

import type { ReactNode } from "react";
import { ModalShell } from "@/components/ui/modal-shell";

type ConfirmationTone = "danger" | "primary" | "success";

type ConfirmationModalProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: ConfirmationTone;
  children?: ReactNode;
};

export function ConfirmationModal({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
  tone = "danger",
  children,
}: ConfirmationModalProps) {
  const confirmClassName = tone === "danger"
    ? "bg-danger-strong text-white hover:bg-danger"
    : tone === "success"
      ? "bg-success-fill text-white hover:bg-success-hover"
      : "bg-brand text-white hover:bg-brand-hover";

  return (
    <ModalShell
      description={description}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmClassName}`}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Working..." : confirmLabel}
          </button>
        </div>
      }
      maxWidthClassName="max-w-md"
      onClose={isConfirming ? undefined : onCancel}
      title={title}
    >
      {children ?? (
        <p className="text-sm text-text-muted">
          This action will be recorded immediately after confirmation.
        </p>
      )}
    </ModalShell>
  );
}
