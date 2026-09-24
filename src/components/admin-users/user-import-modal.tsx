"use client";

import { useState, type ChangeEvent } from "react";
import { importUsers, previewImportUsers } from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import { parseCsvObjects } from "@/lib/csv";
import { CsvColumnGuide } from "@/components/ui/csv-column-guide";
import { CsvFileInput } from "@/components/ui/csv-file-input";
import { CsvTemplateButton } from "@/components/ui/csv-template-button";
import { ImportModalLayout } from "@/components/ui/import-modal-layout";
import type { Role } from "@/lib/session";
import type {
  ImportedUserCredential,
  ImportUserInput,
  ImportUserError,
  ImportUsersPreviewResult,
} from "@/domains/users/user-service";

type UserImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      ok: true;
      users: ImportUserInput[];
    }
  | {
      ok: false;
      message: string;
    };

const csvHeaders =
  "username,first_name,preferred_name,last_name,email,role,card_number";
const csvHeaderColumns = csvHeaders.split(",");
const csvColumns = [
  { name: "username" },
  { name: "first_name" },
  { name: "preferred_name", optional: true },
  { name: "last_name" },
  { name: "email", optional: true },
  { name: "role" },
  { name: "card_number", optional: true },
];
const userTemplateRows = [
  [
    "student.0001",
    "Avery",
    "Avi",
    "Nguyen",
    "avery.nguyen@example.edu",
    "student",
    "100001",
  ],
  [
    "teacher.demo",
    "Jordan",
    "",
    "Taylor",
    "jordan.taylor@example.edu",
    "teacher",
    "",
  ],
];
const validRoles: Role[] = ["admin", "teacher", "student"];

export function UserImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: UserImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [users, setUsers] = useState<ImportUserInput[]>([]);
  const [createdUsers, setCreatedUsers] = useState<ImportedUserCredential[]>(
    [],
  );
  const [preview, setPreview] = useState<ImportUsersPreviewResult | null>(null);
  const [errors, setErrors] = useState<ImportUserError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setUsers([]);
    setCreatedUsers([]);
    setPreview(null);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseUsersCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setUsers(result.users);
    setMessage("Checking import preview...");

    try {
      const previewResult = await previewImportUsers({ users: result.users });

      setPreview(previewResult);
      setMessage(null);
    } catch {
      setError("Could not preview this import. Check the CSV and try again.");
    }
  }

  async function handleImport() {
    if (users.length === 0) {
      setError("Choose a CSV file with at least one user.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);
    setCreatedUsers([]);

    const result = await importUsers({ users });

    setIsImporting(false);
    setErrors(result.errors);
    setCreatedUsers(result.createdUsers);

    if (result.createdCount > 0) {
      const successMessage = `Imported ${result.createdCount} user${result.createdCount === 1 ? "" : "s"}.`;

      setMessage(successMessage);
      onImportCompleted();
      onImported(successMessage, false);
      return;
    }

    setMessage("No users were imported.");
  }

  return (
    <ImportModalLayout
      description="Existing usernames or nonblank emails are skipped and reported below."
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
            disabled={isImporting || users.length === 0 || !preview}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Confirm Import"}
          </button>
        </>
      }
      onClose={onClose}
      title="Import Users"
    >
        <CsvColumnGuide
          columns={csvColumns}
          note="Role must be admin, teacher, or student. Preferred name, email and card number are optional; their headers should stay in the file."
        />

        <CsvFileInput
          fileName={fileName}
          id="csvFile"
          onChange={handleFileChange}
        />
        <div className="mt-3">
          <CsvTemplateButton
            filename="user-import-template.csv"
            headers={csvHeaderColumns}
            rows={userTemplateRows}
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

        {preview && <ImportPreview preview={preview} />}

        {errors.length > 0 && (
          <ImportErrors errors={errors} />
        )}

        {createdUsers.length > 0 && (
          <GeneratedPasswords users={createdUsers} />
        )}

    </ImportModalLayout>
  );
}

function ImportPreview({
  preview,
}: {
  preview: ImportUsersPreviewResult;
}) {
  return (
    <section className="theme-subpanel mt-4 p-3">
      <p className="text-sm font-semibold text-text-control">Import preview</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        <PreviewMetric label="Rows" value={preview.rowCount} />
        <PreviewMetric label="New" value={preview.newCount} />
        <PreviewMetric label="Existing" value={preview.existingCount} />
        <PreviewMetric label="Duplicates" value={preview.duplicateCount} />
        <PreviewMetric label="Invalid" value={preview.invalidCount} />
      </div>
      {(preview.existingCount > 0 ||
        preview.invalidCount > 0 ||
        preview.duplicateCount > 0) && (
        <p className="mt-3 text-sm text-text-muted">
          Existing, duplicate, or invalid rows will be skipped during import.
        </p>
      )}
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-panel-soft px-3 py-2">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

function ImportErrors({ errors }: { errors: ImportUserError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.username}`}>
            Row {error.rowNumber}
            {error.username ? ` (${error.username})` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GeneratedPasswords({ users }: { users: ImportedUserCredential[] }) {
  return (
    <div className="theme-subpanel mt-4 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-control">
          Temporary passwords
        </p>
        <button
          className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
          onClick={() => downloadPasswordCsv(users)}
          type="button"
        >
          Download CSV
        </button>
      </div>
      <div className="mt-2 max-h-44 overflow-y-auto pr-1">
        <div className="grid gap-2 md:hidden">
          {users.map((user) => (
            <GeneratedPasswordCard key={user.username} user={user} />
          ))}
        </div>

        <table aria-label="User import preview" className="hidden w-full text-left text-sm md:table">
          <thead className="text-text-muted">
            <tr>
              <th scope="col" className="py-2 pr-4 font-semibold">Username</th>
              <th scope="col" className="py-2 font-semibold">Password</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-border-subtle" key={user.username}>
                <td className="py-2 pr-4 font-semibold">{user.username}</td>
                <td className="py-2 font-mono text-text-control">
                  {user.temporaryPassword}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadPasswordCsv(users: ImportedUserCredential[]) {
  downloadCsv(
    "imported-user-passwords.csv",
    ["username", "temporary_password"],
    users.map((user) => [user.username, user.temporaryPassword]),
  );
}

function GeneratedPasswordCard({
  user,
}: {
  user: ImportedUserCredential;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface p-3">
      <p className="truncate text-sm font-semibold">{user.username}</p>
      <p className="mt-1 break-all font-mono text-sm text-text-control">
        {user.temporaryPassword}
      </p>
    </article>
  );
}

function parseUsersCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one user row.",
    };
  }

  const users: ImportUserInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const role = values.role?.trim().toLowerCase() as Role;

    if (!validRoles.includes(role)) {
      return {
        ok: false,
        message: `Row ${rowNumber} has an invalid role.`,
      };
    }

    const user = {
      cardNumber: values.cardnumber?.trim() ?? "",
      email: values.email?.trim() ?? "",
      firstName: values.firstname?.trim() ?? "",
      preferredName: values.preferredname?.trim() ?? "",
      lastName: values.lastname?.trim() ?? "",
      role,
      username: values.username?.trim() ?? "",
    };

    if (
      !user.username ||
      !user.firstName ||
      !user.lastName
    ) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing a required value.`,
      };
    }

    users.push(user);
  }

  if (users.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any users.",
    };
  }

  return { ok: true, users };
}
