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
      "status",
    ],
    entries.map((entry) => [
      entry.id,
      entry.teacherName,
      entry.groupName,
      weekDays[entry.dayOfWeek],
      entry.startTime,
      entry.endTime,
      entry.isActive ? "active" : "archived",
    ]),
  );
}
