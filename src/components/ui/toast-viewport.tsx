"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";

export type ToastTone = "error" | "success" | "warning";

export type ToastInput = {
  action?: {
    label: string;
    onSelect: () => void | Promise<void>;
  };
  text: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & {
  id: number;
  tone: ToastTone;
};

const successToastDurationMs = 4500;
const warningToastDurationMs = 6500;
const toastEventName = "myntix:toast";
let nextToastId = 1;

export function showToast({ action, text, tone = "success" }: ToastInput) {
  if (!text.trim() || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ToastItem>(toastEventName, {
      detail: {
        id: nextToastId,
        action,
        text: text.trim(),
        tone,
      },
    }),
  );
  nextToastId += 1;
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const toast = (event as CustomEvent<ToastItem>).detail;

      setToasts((currentToasts) => [
        toast,
        ...currentToasts.filter(
          (currentToast) =>
            currentToast.text !== toast.text || currentToast.tone !== toast.tone,
        ),
      ].slice(0, 3));

      if (toast.tone === "error") {
        return;
      }

      const timeoutId = window.setTimeout(
        () => dismissToast(toast.id),
        toast.tone === "warning"
          ? warningToastDurationMs
          : successToastDurationMs,
      );

      return () => window.clearTimeout(timeoutId);
    }

    window.addEventListener(toastEventName, handleToast);

    return () => {
      window.removeEventListener(toastEventName, handleToast);
    };
  }, []);

  function dismissToast(toastId: number) {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[180] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          onDismiss={() => dismissToast(toast.id)}
          toast={toast}
        />
      ))}
    </div>
  );
}

function ToastCard({
  onDismiss,
  toast,
}: {
  onDismiss: () => void;
  toast: ToastItem;
}) {
  const toneClassName = getToneClassName(toast.tone);
  const role = toast.tone === "error" ? "alert" : "status";

  return (
    <div
      aria-atomic="true"
      className={`pointer-events-auto motion-pop flex w-full max-w-md items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${toneClassName}`}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      role={role}
    >
      <p className="min-w-0 break-words font-medium">{toast.text}</p>
      {toast.action && (
        <button
          className="shrink-0 rounded-md border border-current/25 px-2.5 py-1 font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => {
            void toast.action?.onSelect();
            onDismiss();
          }}
          type="button"
        >
          {toast.action.label}
        </button>
      )}
      <button
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        onClick={onDismiss}
        type="button"
      >
        <XIcon />
      </button>
    </div>
  );
}

function getToneClassName(tone: ToastTone) {
  if (tone === "error") {
    return "border-danger-border bg-danger-soft text-danger-strong";
  }

  if (tone === "warning") {
    return "border-warning-border bg-warning-soft text-warning";
  }

  return "border-success-border bg-success-soft text-success";
}
