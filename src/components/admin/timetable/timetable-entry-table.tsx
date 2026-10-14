import type { ReactNode } from "react";
import { useTableLayout } from "@/components/ui/use-table-layout";
import { weekDays } from "@/components/admin/timetable/timetable-constants";
import { CheckIcon, CopyIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import {
  MobileSelectionShell,
  RowSelectionCheckbox,
} from "@/components/ui/bulk-selection-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveStatusFilterOptions } from "@/components/ui/archive-status-filter";
import { TableActionGrid } from "@/components/ui/table-action-grid";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import type { TimetableFiltersState } from "@/components/admin/timetable/timetable-types";
import type { TimetableEntry } from "@/domains/timetable/timetable-service";
import type { TableSortDirection } from "@/components/ui/table-sorting";
import {
  DataTable,
  DataTableSelectionCell,
  DataTableSelectionHeader,
} from "@/components/ui/data-table";

export function TimetableEntryTable({
  entries,
  onSortChange,
  tableSort,
  filters,
  onDeleteEntry,
  onDuplicateEntry,
  onEditEntry,
  onEntrySelectionChange,
  onFiltersChange,
  onVisibleEntriesSelectionChange,
  selectedEntryIds,
  toolbar,
}: {
  entries: TimetableEntry[];
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  tableSort: { column: string; direction: TableSortDirection } | null;
  filters: TimetableFiltersState;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
  onEntrySelectionChange: (entryId: string, isSelected: boolean) => void;
  onFiltersChange: (filters: TimetableFiltersState) => void;
  onVisibleEntriesSelectionChange: (isSelected: boolean) => void;
  selectedEntryIds: string[];
  toolbar?: ReactNode;
}) {
  const selectedEntryIdSet = new Set(selectedEntryIds);
  const tableLayout = useTableLayout();
  const selectableEntryIds = entries.map((entry) => entry.id);

  function updateFilter<Field extends keyof TimetableFiltersState>(
    field: Field,
    value: TimetableFiltersState[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }
  const areAllVisibleEntriesSelected =
    entries.length > 0 &&
    entries.every((entry) => selectedEntryIdSet.has(entry.id));

  return (
    <>
      {tableLayout !== "desktop" && toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      {tableLayout !== "desktop" && (
        <div className="grid gap-3 md:hidden">
          {entries.map((entry) => (
            <TimetableEntryMobileRow
              entry={entry}
              key={entry.id}
              onDeleteEntry={onDeleteEntry}
              onDuplicateEntry={onDuplicateEntry}
              onEntrySelectionChange={onEntrySelectionChange}
              onEditEntry={onEditEntry}
              selected={selectedEntryIdSet.has(entry.id)}
            />
          ))}
        </div>
      )}

      {tableLayout !== "mobile" && (
        <DataTable ariaLabel="Timetable entries" responsive="desktop" toolbar={toolbar}>
          <colgroup>
            <col className="w-10" />
            <col className="w-[26%]" />
            <col />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="table-action-column" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <DataTableSelectionHeader
                checked={areAllVisibleEntriesSelected}
                label={
                  areAllVisibleEntriesSelected
                    ? "Clear selected timetable entries"
                    : "Select all timetable entries"
                }
                onChange={onVisibleEntriesSelectionChange}
              />
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.groupName)}
                  label="Group"
                  onClear={() => updateFilter("groupName", "")}
                  onSortDirectionChange={(direction) => onSortChange("group", direction)}
                  sortDirection={tableSort?.column === "group" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Search groups"
                    onChange={(value) => updateFilter("groupName", value)}
                    value={filters.groupName}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.teacherName)}
                  label="Teacher"
                  onClear={() => updateFilter("teacherName", "")}
                  onSortDirectionChange={(direction) => onSortChange("teacher", direction)}
                  sortDirection={tableSort?.column === "teacher" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Search teachers"
                    onChange={(value) => updateFilter("teacherName", value)}
                    value={filters.teacherName}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.dayOfWeek)}
                  label="Day"
                  onClear={() => updateFilter("dayOfWeek", "")}
                  onSortDirectionChange={(direction) => onSortChange("day", direction)}
                  sortDirection={tableSort?.column === "day" ? tableSort.direction : null}
                >
                  <TableHeaderFilterSelect
                    label="Day"
                    onChange={(value) => updateFilter("dayOfWeek", value)}
                    options={[
                      { label: "All days", value: "" },
                      ...weekDays.map((day, index) => ({
                        label: day,
                        value: String(index),
                      })),
                    ]}
                    value={filters.dayOfWeek}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter label="Time" onSortDirectionChange={(direction) => onSortChange("time", direction)} sortDirection={tableSort?.column === "time" ? tableSort.direction : null} />
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={filters.status !== "active"}
                  label="Status"
                  onClear={() => updateFilter("status", "active")}
                  onSortDirectionChange={(direction) => onSortChange("status", direction)}
                  sortDirection={tableSort?.column === "status" ? tableSort.direction : null}
                >
                  <TableHeaderFilterSelect
                    label="Status"
                    onChange={(value) =>
                      updateFilter("status", value as TimetableFiltersState["status"])
                    }
                    options={archiveStatusFilterOptions}
                    value={filters.status}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <DataTableSelectionCell
                  checked={selectedEntryIdSet.has(entry.id)}
                  label={`Select ${entry.groupName} timetable entry`}
                  rangeKey="timetable-table"
                  rowId={entry.id}
                  selectableRowIds={selectableEntryIds}
                  onRangeChange={(ids, isSelected) =>
                    ids.forEach((id) => onEntrySelectionChange(id, isSelected))
                  }
                  onChange={(isSelected) =>
                    onEntrySelectionChange(entry.id, isSelected)
                  }
                />
                <td className="py-3 pr-4 font-semibold">{entry.groupName}</td>
                <td className="py-3 pr-4 text-text-muted">{entry.teacherName}</td>
                <td className="py-3 pr-4 text-text-muted">
                  {weekDays[entry.dayOfWeek]}
                  <span className="mt-0.5 block text-xs">{formatCycleWeek(entry.cycleWeek)}</span>
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatTimeRange(entry)}
                </td>
                <td className="py-3 pr-4">
                  <TimetableStatusBadge isActive={entry.isActive} />
                </td>
                <td className="py-3 text-right">
                  <TimetableActions
                    entry={entry}
                    onDeleteEntry={onDeleteEntry}
                    onDuplicateEntry={onDuplicateEntry}
                    onEditEntry={onEditEntry}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}

function TimetableEntryMobileRow({
  entry,
  onDeleteEntry,
  onDuplicateEntry,
  onEntrySelectionChange,
  onEditEntry,
  selected,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEntrySelectionChange: (entryId: string, isSelected: boolean) => void;
  onEditEntry: (entry: TimetableEntry) => void;
  selected: boolean;
}) {
  return (
    <article className="theme-card p-3">
      <MobileSelectionShell
        checkbox={
          <RowSelectionCheckbox
            checked={selected}
            label={`Select ${entry.groupName} timetable entry`}
            onChange={(isSelected) =>
              onEntrySelectionChange(entry.id, isSelected)
            }
          />
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{entry.groupName}</h3>
            <p className="mt-1 truncate text-sm text-text-muted">
              {entry.teacherName}
            </p>
          </div>
          <TimetableActions
            entry={entry}
            onDeleteEntry={onDeleteEntry}
            onDuplicateEntry={onDuplicateEntry}
            onEditEntry={onEditEntry}
          />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-text-muted">
          <p>{weekDays[entry.dayOfWeek]} · {formatCycleWeek(entry.cycleWeek)}</p>
          <p>{formatTimeRange(entry)}</p>
          <TimetableStatusBadge isActive={entry.isActive} />
        </div>
      </MobileSelectionShell>
    </article>
  );
}

function TimetableActions({
  entry,
  onDeleteEntry,
  onDuplicateEntry,
  onEditEntry,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
}) {
  return (
    <TableActionGrid
      label={`Open actions for ${entry.groupName}`}
      items={[
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEditEntry(entry),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateEntry(entry),
        },
        {
          icon: entry.isActive ? <TrashIcon /> : <CheckIcon />,
          label: entry.isActive ? "Archive" : "Restore",
          onSelect: () => onDeleteEntry(entry),
          tone: entry.isActive ? "danger" : "success",
        },
      ]}
    />
  );
}

function TimetableStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      label={isActive ? "Active" : "Archived"}
      tone={isActive ? "success" : "danger"}
    />
  );
}

export function formatTimeRange(entry: TimetableEntry) {
  return `${entry.startTime} - ${entry.endTime}`;
}

function formatCycleWeek(cycleWeek: number | null) {
  return cycleWeek === null ? "Every week" : `Week ${String.fromCharCode(64 + cycleWeek)}`;
}
