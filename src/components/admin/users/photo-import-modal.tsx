"use client";

import { useEffect, useRef, useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { FileInput } from "@/components/ui/file-input";
import type { PhotoImportPreview } from "@/domains/users/photos/photo-import-types";

export function PhotoImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<PhotoImportPreview | null>(null);
  const [operation, setOperation] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/photos/import", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Could not check photo storage. Please sign in again or contact support.",
          );
        const result = await response.json();
        setStorageReady(result.configured);
        if (!result.configured)
          setError(
            "Private photo storage needs to be configured before importing. Contact support.",
          );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Could not check photo storage.",
          );
      });
    return () => controller.abort();
  }, []);

  async function submit(mode: "preview" | "apply") {
    if (!file || busy.current) return;
    busy.current = true;
    setOperation(mode);
    setError(null);
    try {
      const body = new FormData();
      body.set("archive", file);
      body.set("replaceExisting", String(replaceExisting));
      body.set("mode", mode);
      if (preview) body.set("digest", preview.digest);
      const response = await fetch("/api/admin/photos/import", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Could not import photos.");
      if (mode === "preview") setPreview(result);
      else onImported(result.count);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not import photos.",
      );
      if (mode === "apply") setPreview(null);
    } finally {
      busy.current = false;
      setOperation(null);
    }
  }

  return (
    <ModalShell
      title="Import student photos"
      onClose={operation ? undefined : onClose}
      description="Match photos to existing students by their unique username. Students cannot upload photos."
      footer={
        <>
          <button
            type="button"
            className="rounded-md border border-button-border px-4 py-2 text-sm transition hover:bg-panel-soft disabled:opacity-60"
            disabled={Boolean(operation)}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
            disabled={
              !storageReady ||
              Boolean(operation) ||
              !file ||
              file.size > 25 * 1024 * 1024 ||
              (preview !== null && preview.readyCount === 0)
            }
            onClick={() => submit(preview ? "apply" : "preview")}
          >
            {operation === "preview"
              ? "Checking photos..."
              : operation === "apply"
                ? "Importing..."
                : preview
                  ? `Import ${preview.readyCount} photos`
                  : "Preview matches"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Use filenames such as <code>john.smith.jpg</code> for the username{" "}
          <code>john.smith</code>. Put photos directly inside the ZIP, without
          folders. Up to 500 photos, 2 MB each, 25 MB ZIP / 100 MB uncompressed.
          Photos are optional and not backed up.
        </p>
        <label className="block text-sm font-semibold text-text-control">
          Photo ZIP
          <FileInput
            accept=".zip,application/zip"
            disabled={Boolean(operation)}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setPreview(null);
              setError(
                next && next.size > 25 * 1024 * 1024
                  ? "Choose a ZIP up to 25 MB."
                  : null,
              );
            }}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text-control">
          <input
            type="checkbox"
            disabled={Boolean(operation)}
            checked={replaceExisting}
            onChange={(event) => {
              setReplaceExisting(event.target.checked);
              setPreview(null);
            }}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Replace existing student photos
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger-strong">
            {error}
          </p>
        )}
        {preview && (
          <>
            <p role="status" className="text-sm font-semibold">
              {preview.readyCount} ready;{" "}
              {preview.rows.length - preview.readyCount} skipped or invalid.
            </p>
            <ul
              className="max-h-64 divide-y divide-border-subtle overflow-y-auto text-sm"
              aria-label="Photo matches"
            >
              {preview.rows.map((row, index) => (
                <li key={`${row.fileName}:${index}`} className="py-2">
                  <span className="block break-all font-medium">
                    {row.fileName}
                  </span>
                  <span
                    className={
                      row.status === "ready"
                        ? "text-success"
                        : "text-text-muted"
                    }
                  >
                    {row.message}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </ModalShell>
  );
}
