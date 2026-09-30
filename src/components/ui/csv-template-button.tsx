"use client";

import type { CsvCell } from "@/lib/csv/client";
import { FileDownIcon } from "@/components/ui/icons";

type CsvTemplateButtonProps = {
  filename: string;
  headers: string[];
  rows: CsvCell[][];
};

export function CsvTemplateButton({
  filename,
  headers,
  rows,
}: CsvTemplateButtonProps) {
  function handleDownload() {
    const csv = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\n");
    const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
      onClick={handleDownload}
      type="button"
    >
      <FileDownIcon />
      Download Template
    </button>
  );
}

function escapeCsvCell(value: CsvCell) {
  const text = String(value ?? "");

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
