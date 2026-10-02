import { weekDays } from "@/components/admin/timetable/timetable-constants";
import { downloadCsv } from "@/lib/csv/client";
import type { TimetableEntry } from "@/domains/timetable/timetable-service";

export function downloadTimetableEntries(entries: TimetableEntry[]) {
  downloadCsv(
    "timetable.csv",
    [
      "id",
      "teacher",
      "group",
      "day",
      "start_time",
      "end_time",
      "cycle_week_optional",
      "status",
    ],
    entries.map((entry) => [
      entry.id,
      entry.teacherName,
      entry.groupName,
      weekDays[entry.dayOfWeek],
      entry.startTime,
      entry.endTime,
      entry.cycleWeek === null ? "every" : `Week ${String.fromCharCode(64 + entry.cycleWeek)}`,
      entry.isActive ? "active" : "archived",
    ]),
  );
}
