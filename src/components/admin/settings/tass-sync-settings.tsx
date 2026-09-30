"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getTassSyncSettings,
  runTassSync,
  testTassSyncConnection,
  updateTassSyncSettings,
} from "@/lib/actions";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { RefreshCwIcon } from "@/components/ui/icons";
import type { TassSyncSettings } from "@/domains/integrations/directory-sync-types";

const currentYear = new Date().getFullYear();
const fallbackSettings: TassSyncSettings = {
  academicYear: currentYear,
  apiVersion: 3,
  applicationCode: "",
  archiveMissingRecords: true,
  baseUrl: "",
  companyCode: "",
  displayName: "TASS",
  hasTokenKey: false,
  isEnabled: false,
  lastError: "",
  lastSyncCompletedAt: null,
  lastSyncStartedAt: null,
  lastSyncStatus: null,
  lastSyncSummary: null,
  providerType: "tass",
  semester: new Date().getMonth() < 6 ? 1 : 2,
};

export function TassSyncSettingsPanel() {
  const [settings, setSettings] = useState<TassSyncSettings>(fallbackSettings);
  const [tokenKey, setTokenKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operation, setOperation] = useState<"save" | "sync" | "test" | null>(null);

  useEffect(() => {
    let isMounted = true;

    getTassSyncSettings()
      .then((result) => {
        if (isMounted) {
          setSettings(result);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) setError("Could not load TASS sync settings.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function update<Field extends keyof TassSyncSettings>(
    field: Field,
    value: TassSyncSettings[Field],
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function reloadSettings() {
    const nextSettings = await getTassSyncSettings();
    setSettings(nextSettings);
    return nextSettings;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperation("save");
    setError(null);
    setMessage(null);

    try {
      const result = await updateTassSyncSettings({
        academicYear: settings.academicYear,
        apiVersion: settings.apiVersion,
        applicationCode: settings.applicationCode,
        archiveMissingRecords: settings.archiveMissingRecords,
        baseUrl: settings.baseUrl,
        companyCode: settings.companyCode,
        displayName: settings.displayName,
        isEnabled: settings.isEnabled,
        semester: settings.semester,
        tokenKey,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      await reloadSettings();
      setTokenKey("");
      setMessage("TASS sync settings saved.");
    } catch {
      setError("Could not save TASS sync settings.");
    } finally {
      setOperation(null);
    }
  }

  async function handleTest() {
    setOperation("test");
    setError(null);
    setMessage(null);

    try {
      const result = await testTassSyncConnection();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(
        `Connected to TASS. Found ${result.studentCount} students and ${result.teacherCount} teachers.`,
      );
    } catch {
      setError("Could not test the TASS connection.");
    } finally {
      setOperation(null);
    }
  }

  async function handleSync() {
    setOperation("sync");
    setError(null);
    setMessage(null);

    try {
      const result = await runTassSync();

      if (!result.ok) {
        setError(result.message);
        await reloadSettings();
        return;
      }

      await reloadSettings();
      setMessage(formatSyncResult(result.summary));
    } catch {
      setError("Could not run the TASS sync.");
    } finally {
      setOperation(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading TASS settings...</p>;
  }

  return (
    <form className="space-y-5" onSubmit={handleSave}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-text-control">{settings.displayName}</h4>
          <p className="mt-1 text-sm text-text-muted">
            Imports current students, teachers, classes, memberships, and teacher timetables. Runs automatically at midnight in the organisation timezone.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-text-control">
          <input
            checked={settings.isEnabled}
            className="h-4 w-4 accent-[var(--color-brand)]"
            onChange={(event) => update("isEnabled", event.target.checked)}
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SyncTextField id="tass-base-url" label="TASS API URL" onChange={(value) => update("baseUrl", value)} placeholder="https://school.example.edu/tassweb/api/" type="url" value={settings.baseUrl} />
        <SyncTextField id="tass-company-code" label="Company code" onChange={(value) => update("companyCode", value)} value={settings.companyCode} />
        <SyncTextField id="tass-application-code" label="Application code" onChange={(value) => update("applicationCode", value)} value={settings.applicationCode} />
        <div className="min-w-0">
          <label className="text-sm font-semibold text-text-control" htmlFor="tass-token-key">Token key</label>
          <input autoComplete="new-password" className={fieldClassName} id="tass-token-key" onChange={(event) => setTokenKey(event.target.value)} placeholder={settings.hasTokenKey ? "Stored. Enter a new value to replace." : ""} type="password" value={tokenKey} />
        </div>
        <SyncNumberField id="tass-academic-year" label="Academic year" max={2200} min={2000} onChange={(value) => update("academicYear", value)} value={settings.academicYear} />
        <div className="grid grid-cols-2 gap-3">
          <SyncSelectField id="tass-semester" label="Semester" onChange={(value) => update("semester", Number(value))} options={["1", "2", "3", "4"]} value={String(settings.semester)} />
          <SyncSelectField id="tass-api-version" label="API version" onChange={(value) => update("apiVersion", Number(value) as 2 | 3)} options={["3", "2"]} value={String(settings.apiVersion)} />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-md bg-panel-soft px-3 py-3 text-sm text-text-control">
        <input checked={settings.archiveMissingRecords} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" onChange={(event) => update("archiveMissingRecords", event.target.checked)} type="checkbox" />
        <span>
          <span className="block font-semibold">Archive records removed from TASS</span>
          <span className="mt-0.5 block text-text-muted">Only users, groups, and timetable entries previously created or matched by this TASS source are affected. Administrator accounts are never archived.</span>
        </span>
      </label>

      <SyncStatus settings={settings} />
      <FixedNotification error={error} message={message} />

      <div className="flex flex-wrap justify-end gap-2">
        <button className="rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60" disabled={operation !== null || !settings.hasTokenKey} onClick={handleTest} type="button">
          {operation === "test" ? "Testing..." : "Test Connection"}
        </button>
        <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60" disabled={operation !== null || !settings.isEnabled} onClick={handleSync} type="button">
          <RefreshCwIcon />
          {operation === "sync" ? "Syncing..." : "Sync Now"}
        </button>
        <button className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70" disabled={operation !== null} type="submit">
          {operation === "save" ? "Saving..." : "Save TASS"}
        </button>
      </div>
      <p className="text-xs leading-5 text-text-muted">Requires the TASS LMS Integration API with access to students, teachers, subjects, and timetables. Save changes before testing or syncing.</p>
    </form>
  );
}

const fieldClassName = "mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2";

function SyncTextField({ id, label, onChange, placeholder = "", type = "text", value }: { id: string; label: string; onChange: (value: string) => void; placeholder?: string; type?: "text" | "url"; value: string }) {
  return <div className="min-w-0"><label className="text-sm font-semibold text-text-control" htmlFor={id}>{label}</label><input className={fieldClassName} id={id} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} /></div>;
}

function SyncNumberField({ id, label, max, min, onChange, value }: { id: string; label: string; max: number; min: number; onChange: (value: number) => void; value: number }) {
  return <div className="min-w-0"><label className="text-sm font-semibold text-text-control" htmlFor={id}>{label}</label><input className={fieldClassName} id={id} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} /></div>;
}

function SyncSelectField({ id, label, onChange, options, value }: { id: string; label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return <div className="min-w-0"><label className="text-sm font-semibold text-text-control" htmlFor={id}>{label}</label><select className={fieldClassName} id={id} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function SyncStatus({ settings }: { settings: TassSyncSettings }) {
  if (!settings.lastSyncStartedAt) return null;
  return <div className="rounded-md bg-panel-soft px-3 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-text-control">Last sync: {settings.lastSyncStatus ?? "unknown"}</span><span className="text-text-muted">{formatDateTime(settings.lastSyncCompletedAt ?? settings.lastSyncStartedAt)}</span></div>{settings.lastError && <p className="mt-2 text-danger">{settings.lastError}</p>}</div>;
}

function formatSyncResult(summary: NonNullable<TassSyncSettings["lastSyncSummary"]>) {
  return [`${summary.usersCreated} users created`, `${summary.groupsCreated} groups created`, `${summary.timetableCreated} timetable entries created`, `${summary.usersArchived + summary.groupsArchived + summary.timetableArchived} records archived`].join(". ") + ".";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
