export type TimetableFiltersState = {
  dayOfWeek: string;
  groupName: string;
  status: "" | "active" | "archived";
  teacherName: string;
};

export const emptyTimetableFilters: TimetableFiltersState = {
  dayOfWeek: "",
  groupName: "",
  status: "",
  teacherName: "",
};
