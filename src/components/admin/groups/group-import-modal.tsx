"use client";

import { useState, type ChangeEvent } from "react";
import { importGroups } from "@/lib/actions";
import { parseCsvObjects } from "@/lib/csv/server";
import { CsvColumnGuide } from "@/components/ui/csv-column-guide";
import { CsvFileInput } from "@/components/ui/csv-file-input";
import { CsvTemplateButton } from "@/components/ui/csv-template-button";
import { ImportModalLayout } from "@/components/ui/import-modal-layout";
import type {
  ImportGroupError,
  ImportGroupMembershipInput,
} from "@/domains/groups/group-import-service";

type GroupImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      memberships: ImportGroupMembershipInput[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const csvHeaders = "group_name,username,description";
const csvHeaderColumns = csvHeaders.split(",");
const csvColumns = [
  { name: "group_name" },
  { name: "username" },
  { name: "description", optional: true },
];
const groupTemplateRows = [
  ["Grade 4", "student.0001", "Grade 4 students"],
  ["Music", "student.0001", ""],
];

export function GroupImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: GroupImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [memberships, setMemberships] = useState<ImportGroupMembershipInput[]>(
    [],
  );
  const [errors, setErrors] = useState<ImportGroupError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMemberships([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseGroupsCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMemberships(result.memberships);
    setMessage(`${result.memberships.length} memberships ready to import.`);
  }

  async function handleImport() {
    if (memberships.length === 0) {
      setError("Choose a CSV file with at least one group membership.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);

    const result = await importGroups({ memberships });
    const importedText = [
      `${result.createdMembershipCount} membership${result.createdMembershipCount === 1 ? "" : "s"}`,
      `${result.createdGroupCount} group${result.createdGroupCount === 1 ? "" : "s"}`,
    ].join(", ");
    const successMessage = `Imported ${importedText}.`;

    setIsImporting(false);
    setErrors(result.errors);
    setMessage(successMessage);
    onImportCompleted();
    onImported(successMessage, false);
  }

  return (
    <ImportModalLayout
      description="Existing groups are reused. The description column is optional."
      footer={
        <>
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isImporting || memberships.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Groups"}
          </button>
        </>
      }
      onClose={onClose}
      title="Import Groups"
    >
        <CsvColumnGuide
          columns={csvColumns}
          note="Each row maps one username to one group. Optional columns can be left blank but the header should stay in the file."
        />

        <CsvFileInput
          fileName={fileName}
          id="groupCsvFile"
          onChange={handleFileChange}
        />
        <div className="mt-3">
          <CsvTemplateButton
            filename="group-import-template.csv"
            headers={csvHeaderColumns}
            rows={groupTemplateRows}
          />
        </div>

        {message && (
          <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}

        {errors.length > 0 && (
          <ImportErrors errors={errors} />
        )}

    </ImportModalLayout>
  );
}

function ImportErrors({ errors }: { errors: ImportGroupError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.groupName}-${error.username}`}>
            Row {error.rowNumber}
            {error.groupName ? ` (${error.groupName})` : ""}
            {error.username ? ` / ${error.username}` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseGroupsCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one membership row.",
    };
  }

  const memberships: ImportGroupMembershipInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const membership = {
      description: values.description?.trim() ?? "",
      groupName: values.groupname?.trim() ?? "",
      username: values.username?.trim() ?? "",
    };

    if (!membership.groupName || !membership.username) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing a group name or username.`,
      };
    }

    memberships.push(membership);
  }

  if (memberships.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any group memberships.",
    };
  }

  return { memberships, ok: true };
}
