"use client";

import { useEffect, useState } from "react";
import {
  completeSetupChecklistStep,
  getSetupChecklist,
  setSetupChecklistDismissed,
} from "@/lib/actions";
import type { NavigationItem } from "@/components/app-nav";
import { CheckIcon } from "@/components/ui/icons";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type {
  SetupChecklistStepKey,
  SetupChecklistSummary,
} from "@/domains/organisation/setup-checklist-service";

type AdminSetupChecklistProps = {
  onNavigate: (target: NavigationItem) => void;
  userId: string;
};

const hiddenSessionKeyPrefix = "myntix:setup-checklist:hidden";

export function AdminSetupChecklist({
  onNavigate,
  userId,
}: AdminSetupChecklistProps) {
  const hiddenSessionKey = `${hiddenSessionKeyPrefix}:${userId}`;
  const [summary, setSummary] = useState<SetupChecklistSummary | null>(null);
  const [isHiddenForSession, setIsHiddenForSession] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(hiddenSessionKey) === "true",
  );
  const [isDismissConfirmationOpen, setIsDismissConfirmationOpen] =
    useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getSetupChecklist()
      .then((loadedSummary) => {
        if (isMounted) setSummary(loadedSummary);
      })
      .catch(() => {
        // Setup guidance must never prevent the dashboard from loading.
      });

    return () => {
      isMounted = false;
    };
  }, [hiddenSessionKey]);

  function hideForSession() {
    window.sessionStorage.setItem(hiddenSessionKey, "true");
    setIsHiddenForSession(true);
  }

  function showForSession() {
    window.sessionStorage.removeItem(hiddenSessionKey);
    setIsHiddenForSession(false);
  }

  async function dismissPermanently() {
    setIsUpdating(true);
    try {
      await setSetupChecklistDismissed(true);
      setSummary((current) =>
        current ? { ...current, isDismissed: true } : current,
      );
      setIsDismissConfirmationOpen(false);
    } finally {
      setIsUpdating(false);
    }
  }

  async function completeStep(stepKey: SetupChecklistStepKey) {
    setIsUpdating(true);
    try {
      await completeSetupChecklistStep(stepKey);
      setSummary(await getSetupChecklist());
    } finally {
      setIsUpdating(false);
    }
  }

  if (!summary) return null;

  if (summary.isDismissed) {
    return null;
  }

  if (isHiddenForSession) {
    return (
      <div className="mt-2 flex justify-end">
        <button
          className="text-xs font-medium text-text-muted transition hover:text-text-control"
          onClick={showForSession}
          type="button"
        >
          Show setup checklist
        </button>
      </div>
    );
  }

  const progress = Math.round(
    (summary.completedCount / summary.totalCount) * 100,
  );

  return (
    <section className="theme-panel mt-2 overflow-hidden" aria-labelledby="setup-checklist-title">
      <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-text-control" id="setup-checklist-title">
                Getting started
              </h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Finish the essentials at your own pace. Nothing here blocks normal use.
              </p>
            </div>
            <p className="text-sm font-medium text-text-control">
              {summary.completedCount} of {summary.totalCount} complete
            </p>
          </div>
          <div
            aria-label={`${progress}% of setup complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <button
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-muted hover:text-text-control"
            onClick={hideForSession}
            type="button"
          >
            Hide for now
          </button>
          <button
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-muted hover:text-text-control"
            disabled={isUpdating}
            onClick={() => setIsDismissConfirmationOpen(true)}
            type="button"
          >
            Dismiss permanently
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2">
        {summary.items.map((item) => (
          <div
            className="flex min-w-0 gap-3 border-b border-border-subtle px-5 py-3.5 sm:odd:border-r"
            key={item.key}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.isComplete
                  ? "border-success-border bg-success-fill text-white"
                  : "border-border bg-surface text-transparent"
              }`}
            >
              <CheckIcon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${item.isComplete ? "text-text-muted" : "text-text-control"}`}>
                {item.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-text-muted">
                {item.description}
              </p>
              {!item.isComplete && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    className="text-xs font-semibold text-brand-ink transition hover:text-brand"
                    onClick={() => onNavigate(item.target as NavigationItem)}
                    type="button"
                  >
                    Open {item.target}
                  </button>
                  {item.manualActionLabel && (
                    <button
                      className="text-xs font-medium text-text-muted transition hover:text-text-control disabled:opacity-50"
                      disabled={isUpdating}
                      onClick={() => completeStep(item.key)}
                      type="button"
                    >
                      {item.manualActionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {isDismissConfirmationOpen && (
        <ConfirmationModal
          confirmLabel="Dismiss permanently"
          description="The checklist will be removed from your dashboard. You can restore it later from Admin Settings."
          isConfirming={isUpdating}
          onCancel={() => setIsDismissConfirmationOpen(false)}
          onConfirm={dismissPermanently}
          title="Dismiss getting started?"
          tone="primary"
        />
      )}
    </section>
  );
}
