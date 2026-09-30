"use client";

import { useState, type ChangeEvent } from "react";
import { importShopItems } from "@/lib/actions";
import { parseCsvObjects } from "@/lib/csv/server";
import { CsvColumnGuide } from "@/components/ui/csv-column-guide";
import { CsvFileInput } from "@/components/ui/csv-file-input";
import { CsvTemplateButton } from "@/components/ui/csv-template-button";
import { ImportModalLayout } from "@/components/ui/import-modal-layout";
import type {
  ImportShopItemError,
  ImportShopItemInput,
} from "@/domains/rewards/shop-service";

type ShopImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      items: ImportShopItemInput[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const csvHeaders = "name,description,price,quantity,unlimited_quantity,image_url";
const csvHeaderColumns = csvHeaders.split(",");
const csvColumns = [
  { name: "name" },
  { name: "price" },
  { name: "quantity" },
  { name: "unlimited_quantity", optional: true },
  { name: "description", optional: true },
  { name: "image_url", optional: true },
];
const shopTemplateRows = [
  ["Homework Pass", "One homework pass approved by staff", 50, 10, false, ""],
  ["Canteen Voucher", "", 100, 0, true, ""],
];

export function ShopImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: ShopImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<ImportShopItemInput[]>([]);
  const [errors, setErrors] = useState<ImportShopItemError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setItems([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseShopItemsCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setItems(result.items);
    setMessage(`${result.items.length} item${result.items.length === 1 ? "" : "s"} ready to import.`);
  }

  async function handleImport() {
    if (items.length === 0) {
      setError("Choose a CSV file with at least one reward item.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);

    const result = await importShopItems({ items });
    const importedText = [
      `${result.createdCount} created`,
      `${result.updatedCount} updated`,
    ].join(", ");
    const successMessage = `Imported rewards: ${importedText}.`;

    setIsImporting(false);
    setErrors(result.errors);
    setMessage(successMessage);
    onImportCompleted();
    onImported(successMessage, false);
  }

  return (
    <ImportModalLayout
      description="Existing items with the same name are updated."
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
            disabled={isImporting || items.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Items"}
          </button>
        </>
      }
      onClose={onClose}
      title="Import Rewards"
    >
        <CsvColumnGuide
          columns={csvColumns}
          note="Optional columns can be left blank but the header should stay in the file. Set unlimited_quantity to true to avoid reserving stock. Price and quantity must be zero or greater."
        />

        <CsvFileInput
          fileName={fileName}
          id="shopCsvFile"
          onChange={handleFileChange}
        />
        <div className="mt-3">
          <CsvTemplateButton
            filename="reward-import-template.csv"
            headers={csvHeaderColumns}
            rows={shopTemplateRows}
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

        {errors.length > 0 && <ImportErrors errors={errors} />}

    </ImportModalLayout>
  );
}

function ImportErrors({ errors }: { errors: ImportShopItemError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.name}`}>
            Row {error.rowNumber}
            {error.name ? ` (${error.name})` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseShopItemsCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one item row.",
    };
  }

  const items: ImportShopItemInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const price = Number(values.price?.trim() ?? "");
    const quantity = Number(values.quantity?.trim() ?? "");
    const isQuantityUnlimited = parseOptionalBoolean(
      values.unlimitedquantity?.trim() ?? "",
    );
    const name = values.name?.trim() ?? "";

    if (!name) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing an item name.`,
      };
    }

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(quantity) ||
      isQuantityUnlimited === null
    ) {
      return {
        ok: false,
        message: `Row ${rowNumber} has an invalid price, quantity, or unlimited quantity value.`,
      };
    }

    if (price < 0 || quantity < 0) {
      return {
        ok: false,
        message: `Row ${rowNumber} has a negative price or quantity.`,
      };
    }

    items.push({
      description: values.description?.trim() ?? "",
      imageUrl: values.imageurl?.trim() ?? "",
      isQuantityUnlimited,
      name,
      price,
      quantity,
    });
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any reward items.",
    };
  }

  return { items, ok: true };
}

function parseOptionalBoolean(value: string) {
  if (!value) {
    return false;
  }

  if (["true", "yes", "1"].includes(value.toLowerCase())) {
    return true;
  }

  if (["false", "no", "0"].includes(value.toLowerCase())) {
    return false;
  }

  return null;
}
