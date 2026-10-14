export const activityHeatmapWindowDays = 365;

export function getActivityYearRange(now = new Date()) {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - activityHeatmapWindowDays + 1);

  const endDateExclusive = new Date(now);
  endDateExclusive.setHours(0, 0, 0, 0);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  return { endDateExclusive, startDate };
}
