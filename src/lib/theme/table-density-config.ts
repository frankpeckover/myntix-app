export type TableDensity = "compact" | "default" | "roomy";

export const defaultTableDensity: TableDensity = "default";
export const tableDensityOptions: Array<{
  description: string;
  label: string;
  value: TableDensity;
}> = [
  { description: "About 40px per row", label: "Compact", value: "compact" },
  { description: "About 48px per row", label: "Default", value: "default" },
  { description: "About 56px per row", label: "Roomy", value: "roomy" },
];

export function isTableDensity(value: string | null): value is TableDensity {
  return value === "compact" || value === "default" || value === "roomy";
}
