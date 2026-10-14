export const studentActivityTimeframeOptions = [
  { label: "24 hours", value: "day" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
  { label: "90 days", value: "quarter" },
  { label: "1 year", value: "year" },
  { label: "Custom", value: "custom" },
] as const;

export type StudentActivityWindow =
  (typeof studentActivityTimeframeOptions)[number]["value"];

export type StudentActivityRange = { start: Date; end: Date };

export function getStudentActivityRange(
  selectedWindow: StudentActivityWindow,
  customRange: { endDate: string; startDate: string },
  now = new Date(),
): StudentActivityRange {
  if (selectedWindow === "custom") {
    const start = parseDateInput(customRange.startDate, false);
    const end = parseDateInput(customRange.endDate, true);
    if (start && end && start <= end && start <= now) {
      return { start, end: end > now ? now : end };
    }
  }

  const days = selectedWindow === "day" ? 1
    : selectedWindow === "week" ? 7
      : selectedWindow === "quarter" ? 90
        : selectedWindow === "year" ? 365 : 30;
  return { end: now, start: new Date(now.getTime() - days * 86_400_000) };
}

function parseDateInput(value: string, endOfDay: boolean) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
