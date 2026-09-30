export type CsvCell = boolean | null | number | string | undefined;

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][],
) {
  const csv = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = addExportTimestamp(filename);
  link.click();
  URL.revokeObjectURL(url);
}

function addExportTimestamp(filename: string) {
  const timestamp = formatExportTimestamp(new Date());
  const extensionIndex = filename.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return `${filename}-${timestamp}`;
  }

  return `${filename.slice(0, extensionIndex)}-${timestamp}${filename.slice(extensionIndex)}`;
}

function formatExportTimestamp(date: Date) {
  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  const year = padDatePart(date.getFullYear() % 100);
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${day}${month}${year}${hours}${minutes}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function escapeCsvCell(value: CsvCell) {
  const text = String(value ?? "");

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
