export const secondaryStartingYearLevel = 7;

export function parseOptionalYearLevel(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === undefined || value === null || value === "")
    return { ok: true, value: null };
  const number =
    typeof value === "number" ||
    (typeof value === "string" && /^\d{1,2}$/.test(value))
      ? Number(value)
      : NaN;
  if (!Number.isInteger(number) || number < 0 || number > 12) {
    return {
      ok: false,
      message:
        "Year level must be blank or a whole number from 0 (Prep) to 12.",
    };
  }
  return { ok: true, value: number };
}

export function usesSimpleStudentDashboard(
  yearLevel: number | null | undefined,
) {
  return (
    typeof yearLevel === "number" &&
    Number.isInteger(yearLevel) &&
    yearLevel >= 0 &&
    yearLevel < secondaryStartingYearLevel
  );
}
