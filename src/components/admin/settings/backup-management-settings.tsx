"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTenantBackupOverview,
  requestTenantBackup,
  requestTenantRestore,
} from "@/lib/actions";
import type {
  TenantBackupOverview,
} from "@/domains/operations/tenant-backup-service";
import { FileDownIcon, RefreshCwIcon } from "@/components/ui/icons";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { ModalShell } from "@/components/ui/modal-shell";

const refreshIntervalMilliseconds = 10_000;

export function BackupManagementSettings() {
  const [overview, setOverview] = useState<TenantBackupOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingBackup, setIsRequestingBackup] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [isRequestingRestore, setIsRequestingRestore] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const result = await getTenantBackupOverview();
      setOverview(result);
      setError(null);
    } catch {
      setError("Could not load backup history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function refreshOverview() {
      try {
        const result = await getTenantBackupOverview();
        if (isMounted) {
          setOverview(result);
          setError(null);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setError("Could not load backup history.");
          setIsLoading(false);
        }
      }
    }

    void refreshOverview();
    const interval = window.setInterval(
      () => void refreshOverview(),
      refreshIntervalMilliseconds,
    );
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const hasActiveJob =
    overview?.jobs.some((job) => job.status === "queued" || job.status === "running") ??
    false;
  const selectedBackup = overview?.backups.find(
    (backup) => backup.id === restoreBackupId,
  );

  async function handleBackupNow() {
    setIsRequestingBackup(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestTenantBackup();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      await loadOverview();
    } catch {
      setError("Could not queue the backup.");
    } finally {
      setIsRequestingBackup(false);
    }
  }

  async function handleRestore() {
    if (!restoreBackupId) return;
    setIsRequestingRestore(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestTenantRestore({
        backupId: restoreBackupId,
        confirmation: restoreConfirmation,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      closeRestoreModal();
      await loadOverview();
    } catch {
      setError("Could not queue the restore.");
    } finally {
      setIsRequestingRestore(false);
    }
  }

  function closeRestoreModal() {
    setRestoreBackupId(null);
    setRestoreConfirmation("");
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading backup history...</p>;
  }

  if (!overview?.configured) {
    return (
      <div className="rounded-md bg-panel-soft p-4">
        <p className="text-sm font-semibold text-text-control">Backup service unavailable</p>
        <p className="mt-1 text-sm text-text-muted">
          Configure the backup catalogue database and worker before enabling self-service backups.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FixedNotification error={error} message={message} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-control">Tenant restore points</p>
          <p className="mt-1 text-sm text-text-muted">
            Backups are encrypted, verified and isolated to {overview.organisationName}.
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={hasActiveJob || isRequestingBackup}
          onClick={handleBackupNow}
          type="button"
        >
          <FileDownIcon />
          {isRequestingBackup ? "Queuing..." : "Backup Now"}
        </button>
      </div>

      {overview.jobs[0] && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold capitalize text-text-control">
              {overview.jobs[0].jobType} {formatJobStatus(overview.jobs[0].status)}
            </p>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {formatPhase(overview.jobs[0].phase)} · {formatDateTime(overview.jobs[0].requestedAt)}
            </p>
            {overview.jobs[0].status === "failed" && (
              <p className="mt-1 text-xs text-danger-strong">
                There has been an issue with your backups. Please contact support.
              </p>
            )}
          </div>
          {(overview.jobs[0].status === "queued" || overview.jobs[0].status === "running") && (
            <RefreshCwIcon className="h-4 w-4 shrink-0 animate-spin text-brand" />
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border-subtle">
        {overview.backups.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No verified restore points yet.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {overview.backups.map((backup) => (
              <div
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={backup.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-control">
                    {formatDateTime(backup.completedAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatBackupSource(backup.source)} · {formatBytes(backup.sizeBytes)} · Verified
                  </p>
                </div>
                <button
                  className="shrink-0 self-end rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                  disabled={hasActiveJob}
                  onClick={() => setRestoreBackupId(backup.id)}
                  type="button"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedBackup && (
        <ModalShell
          description={`Restore ${overview.organisationName} to ${formatDateTime(selectedBackup.completedAt)}.`}
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <button
                className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
                disabled={isRequestingRestore}
                onClick={closeRestoreModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-danger-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isRequestingRestore ||
                  restoreConfirmation !== overview.organisationName
                }
                onClick={handleRestore}
                type="button"
              >
                {isRequestingRestore ? "Queuing..." : "Restore Backup"}
              </button>
            </div>
          }
          maxWidthClassName="max-w-lg"
          onClose={isRequestingRestore ? undefined : closeRestoreModal}
          title="Confirm Tenant Restore"
        >
          <div className="mt-5 space-y-4">
            <div className="rounded-md bg-warning-soft p-3 text-sm text-warning">
              Current tenant data will be replaced. A fresh safety backup is created first, and all sessions are invalidated after restoration.
            </div>
            <div>
              <label className="text-sm font-semibold text-text-control" htmlFor="restore-confirmation">
                Enter {overview.organisationName} to continue
              </label>
              <input
                autoComplete="off"
                className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                id="restore-confirmation"
                onChange={(event) => setRestoreConfirmation(event.target.value)}
                value={restoreConfirmation}
              />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function formatBackupSource(source: TenantBackupOverview["backups"][number]["source"]) {
  return source === "pre_restore"
    ? "Pre-restore safety backup"
    : source === "scheduled"
      ? "Scheduled backup"
      : "Manual backup";
}

function formatJobStatus(status: TenantBackupOverview["jobs"][number]["status"]) {
  return status === "succeeded" ? "complete" : status;
}

function formatPhase(phase: string) {
  return phase.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}
