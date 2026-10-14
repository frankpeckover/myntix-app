import type { ArchiveStatusFilter } from "@/components/ui/archive-status-filter";

export type TimetableFiltersState = {
  dayOfWeek: string;
  groupName: string;
  status: ArchiveStatusFilter;
  teacherName: string;
};

export const emptyTimetableFilters: TimetableFiltersState = {
  dayOfWeek: "",
  groupName: "",
  status: "active",
  teacherName: "",
};
