export type ArchiveStatusFilter = "all" | "archived" | "active";
export type ArchiveBulkAction = "archive" | "restore";

export const archiveStatusFilterOptions: { label: string; value: ArchiveStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Archived", value: "archived" },
  { label: "Active", value: "active" },
];

export function matchesArchiveStatus(
  isActive: boolean,
  filter: ArchiveStatusFilter,
) {
  return filter === "all" || (filter === "active" ? isActive : !isActive);
}

export function archiveBulkActionsForFilter(
  filter: ArchiveStatusFilter,
): ArchiveBulkAction[] {
  if (filter === "archived") {
    return ["restore"];
  }

  if (filter === "active") {
    return ["archive"];
  }

  return ["archive", "restore"];
}
