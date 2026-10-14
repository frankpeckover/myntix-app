"use client";

import { useState, type ReactNode } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  MobileSelectionShell,
  RowSelectionCheckbox,
} from "@/components/ui/bulk-selection-controls";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveStatusFilterOptions, type ArchiveStatusFilter } from "@/components/ui/archive-status-filter";
import { TableActionGrid } from "@/components/ui/table-action-grid";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import type { GroupListItem } from "@/domains/groups/group-service";
import { sortTableItems, type TableSortDirection } from "@/components/ui/table-sorting";
import {
  DataTable,
  DataTableSelectionCell,
  DataTableSelectionHeader,
} from "@/components/ui/data-table";

type GroupFilters = {
  description: string;
  memberMax: string;
  memberMin: string;
  name: string;
};

type GroupListPanelProps = {
  emptyAction?: ReactNode;
  filters: GroupFilters;
  groups: GroupListItem[];
  hasActiveFilters: boolean;
  isLoading: boolean;
  onClearFilters: () => void;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onEditMembers: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupSelectionChange: (groupId: string, isSelected: boolean) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
  onVisibleGroupsSelectionChange: (isSelected: boolean) => void;
  onFiltersChange: (filters: GroupFilters) => void;
  onStatusFilterChange: (status: ArchiveStatusFilter) => void;
  selectedGroupId: string;
  selectedGroupIds: string[];
  statusFilter: ArchiveStatusFilter;
  toolbar?: ReactNode;
  totalGroupsCount: number;
};

export function GroupListPanel({
  emptyAction,
  filters,
  groups,
  hasActiveFilters,
  isLoading,
  onClearFilters,
  onDuplicateGroup,
  onEditGroup,
  onEditMembers,
  onGroupSelect,
  onGroupSelectionChange,
  onGroupStatusChange,
  onVisibleGroupsSelectionChange,
  onFiltersChange,
  onStatusFilterChange,
  selectedGroupId,
  selectedGroupIds,
  statusFilter,
  toolbar,
  totalGroupsCount,
}: GroupListPanelProps) {
  const [tableSort, setTableSort] = useState<{ column: string; direction: TableSortDirection } | null>(null);
  const sortedGroups = sortTableItems(groups, tableSort, (group, column) => {
    switch (column) {
      case "name": return group.name;
      case "description": return group.description;
      case "members": return group.memberCount;
      case "status": return group.isActive ? "Active" : "Archived";
      default: return "";
    }
  });
  const {
    page,
    pageItems: visibleGroups,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
  } = usePagedList(sortedGroups);

  return (
    <div>
      <div>
        {isLoading && (
          <LoadingSkeleton className="px-0" lines={5} />
        )}
        {!isLoading && totalGroupsCount === 0 && (
          <EmptyState
            action={emptyAction}
            description="Create a group or import a CSV to organise students."
            icon={<CheckIcon />}
            title="No groups found"
          />
        )}
        {!isLoading && totalGroupsCount > 0 && (
          <>
            <GroupList
              filters={filters}
              groups={visibleGroups}
              onSortChange={(column, direction) => setTableSort(direction ? { column, direction } : null)}
              tableSort={tableSort}
              onDuplicateGroup={onDuplicateGroup}
              onEditGroup={onEditGroup}
              onEditMembers={onEditMembers}
              onGroupSelect={onGroupSelect}
              onGroupSelectionChange={onGroupSelectionChange}
              onGroupStatusChange={onGroupStatusChange}
              onVisibleGroupsSelectionChange={onVisibleGroupsSelectionChange}
              onFiltersChange={onFiltersChange}
              onStatusFilterChange={onStatusFilterChange}
              selectedGroupId={selectedGroupId}
              selectedGroupIds={selectedGroupIds}
              statusFilter={statusFilter}
              toolbar={toolbar}
            />
            {groups.length === 0 && (
              <EmptyState
                action={
                  hasActiveFilters ? (
                    <IconButton
                      label="Clear group filters"
                      onClick={onClearFilters}
                      text="Clear Filters"
                    >
                      <XIcon />
                    </IconButton>
                  ) : undefined
                }
                description="Try changing or clearing the filters to see more groups."
                icon={<CheckIcon />}
                title="No groups match these filters"
              />
            )}
            {groups.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                totalCount={groups.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GroupList({
  filters,
  groups,
  onDuplicateGroup,
  onEditGroup,
  onEditMembers,
  onGroupSelect,
  onGroupSelectionChange,
  onGroupStatusChange,
  onVisibleGroupsSelectionChange,
  onFiltersChange,
  onStatusFilterChange,
  onSortChange,
  selectedGroupId,
  selectedGroupIds,
  statusFilter,
  tableSort,
  toolbar,
}: {
  filters: GroupFilters;
  groups: GroupListItem[];
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onEditMembers: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupSelectionChange: (groupId: string, isSelected: boolean) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
  onVisibleGroupsSelectionChange: (isSelected: boolean) => void;
  onFiltersChange: (filters: GroupFilters) => void;
  onStatusFilterChange: (status: ArchiveStatusFilter) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  selectedGroupId: string;
  selectedGroupIds: string[];
  statusFilter: ArchiveStatusFilter;
  tableSort: { column: string; direction: TableSortDirection } | null;
  toolbar?: ReactNode;
}) {
  const selectedGroupIdSet = new Set(selectedGroupIds);
  const selectableGroupIds = groups.map((group) => group.id);
  const areAllVisibleGroupsSelected =
    groups.length > 0 &&
    groups.every((group) => selectedGroupIdSet.has(group.id));

  function updateFilter(field: keyof GroupFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid min-w-0 gap-2 md:hidden">
        {groups.map((group) => (
          <GroupCard
            group={group}
            isSelected={selectedGroupId === group.id}
            key={group.id}
            onDuplicateGroup={onDuplicateGroup}
            onEditGroup={onEditGroup}
            onEditMembers={onEditMembers}
            onGroupSelect={onGroupSelect}
            onGroupSelectionChange={onGroupSelectionChange}
            onGroupStatusChange={onGroupStatusChange}
            selected={selectedGroupIdSet.has(group.id)}
          />
        ))}
      </div>

      <DataTable ariaLabel="Groups" responsive="desktop" toolbar={toolbar}>
        <colgroup>
          <col className="w-10" />
          <col className="w-[28%]" />
          <col />
          <col className="w-28" />
          <col className="w-24" />
          <col className="table-action-column" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <DataTableSelectionHeader
              checked={areAllVisibleGroupsSelected}
              label={
                areAllVisibleGroupsSelected
                  ? "Clear selected groups"
                  : "Select all groups"
              }
              onChange={onVisibleGroupsSelectionChange}
            />
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.name)}
                label="Name"
                onClear={() => updateFilter("name", "")}
                onSortDirectionChange={(direction) => onSortChange("name", direction)}
                sortDirection={tableSort?.column === "name" ? tableSort.direction : null}
              >
                <TableHeaderFilterInput
                  label="Search names"
                  onChange={(value) => updateFilter("name", value)}
                  value={filters.name}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.description)}
                label="Description"
                onClear={() => updateFilter("description", "")}
                onSortDirectionChange={(direction) => onSortChange("description", direction)}
                sortDirection={tableSort?.column === "description" ? tableSort.direction : null}
              >
                <TableHeaderFilterInput
                  label="Search descriptions"
                  onChange={(value) => updateFilter("description", value)}
                  value={filters.description}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.memberMin || filters.memberMax)}
                label="Members"
                onClear={() =>
                  onFiltersChange({
                    ...filters,
                    memberMax: "",
                    memberMin: "",
                  })
                }
                onSortDirectionChange={(direction) => onSortChange("members", direction)}
                sortDirection={tableSort?.column === "members" ? tableSort.direction : null}
              >
                <div className="grid gap-3">
                  <TableHeaderFilterInput
                    label="Minimum"
                    onChange={(value) => updateFilter("memberMin", value)}
                    type="number"
                    value={filters.memberMin}
                  />
                  <TableHeaderFilterInput
                    label="Maximum"
                    onChange={(value) => updateFilter("memberMax", value)}
                    type="number"
                    value={filters.memberMax}
                  />
                </div>
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={statusFilter !== "active"}
                label="Status"
                onClear={() => onStatusFilterChange("active")}
                onSortDirectionChange={(direction) => onSortChange("status", direction)}
                sortDirection={tableSort?.column === "status" ? tableSort.direction : null}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) => onStatusFilterChange(value as ArchiveStatusFilter)}
                  options={archiveStatusFilterOptions}
                  value={statusFilter}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              className={`border-b border-border-subtle ${
                selectedGroupId === group.id ? "bg-brand-soft" : ""
              }`}
              key={group.id}
            >
              <DataTableSelectionCell
                checked={selectedGroupIdSet.has(group.id)}
                label={`Select ${group.name}`}
                rangeKey="groups-table"
                rowId={group.id}
                selectableRowIds={selectableGroupIds}
                onRangeChange={(ids, isSelected) =>
                  ids.forEach((id) => onGroupSelectionChange(id, isSelected))
                }
                onChange={(isSelected) =>
                  onGroupSelectionChange(group.id, isSelected)
                }
              />
              <td className="py-3 pr-4 font-semibold">{group.name}</td>
              <td className="py-3 pr-4 text-text-muted">
                {group.description || "-"}
              </td>
              <td className="py-3 pr-4 text-right text-text-muted">
                {group.memberCount}
              </td>
              <td className="py-3 pr-4">
                <GroupStatusBadge group={group} />
              </td>
              <td className="py-3 text-right">
                <GroupActions
                  group={group}
                  onDuplicateGroup={onDuplicateGroup}
                  onEditGroup={onEditGroup}
                  onEditMembers={onEditMembers}
                  onGroupSelect={onGroupSelect}
                  onGroupStatusChange={onGroupStatusChange}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}

function GroupCard({
  group,
  isSelected,
  onDuplicateGroup,
  onEditGroup,
  onEditMembers,
  onGroupSelect,
  onGroupSelectionChange,
  onGroupStatusChange,
  selected,
}: {
  group: GroupListItem;
  isSelected: boolean;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onEditMembers: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupSelectionChange: (groupId: string, isSelected: boolean) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
  selected: boolean;
}) {
  return (
    <article
      className={`min-w-0 max-w-full overflow-hidden rounded-md border p-2.5 sm:p-3 ${
        isSelected
          ? "border-brand bg-brand-soft"
          : "border-border-subtle bg-surface"
      }`}
    >
      <MobileSelectionShell
        checkbox={
          <RowSelectionCheckbox
            checked={selected}
            label={`Select ${group.name}`}
            onChange={(isSelected) =>
              onGroupSelectionChange(group.id, isSelected)
            }
          />
        }
      >
        <div className="flex items-start justify-between gap-3">
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => onGroupSelect(group)}
            type="button"
          >
            <h3 className="truncate text-sm font-semibold">{group.name}</h3>
            <p className="mt-1 truncate text-sm text-text-muted">
              {group.description || "No description"}
            </p>
          </button>
          <GroupActions
            group={group}
            onDuplicateGroup={onDuplicateGroup}
            onEditGroup={onEditGroup}
            onEditMembers={onEditMembers}
            onGroupSelect={onGroupSelect}
            onGroupStatusChange={onGroupStatusChange}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted sm:mt-3">
          <span>{group.memberCount} members</span>
          <GroupStatusBadge group={group} />
        </div>
      </MobileSelectionShell>
    </article>
  );
}

function GroupActions({
  group,
  onDuplicateGroup,
  onEditGroup,
  onEditMembers,
  onGroupSelect,
  onGroupStatusChange,
}: {
  group: GroupListItem;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onEditMembers: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
}) {
  return (
    <TableActionGrid
      label={`Open actions for ${group.name}`}
      items={[
        {
          icon: <EyeIcon />,
          label: "View",
          onSelect: () => onGroupSelect(group),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateGroup(group),
        },
        {
          icon: <PencilIcon />,
          label: "Edit Group",
          onSelect: () => onEditGroup(group),
        },
        {
          icon: <UsersIcon />,
          label: "Edit Members",
          onSelect: () => onEditMembers(group),
        },
        {
          icon: group.isActive ? <TrashIcon /> : <CheckIcon />,
          label: group.isActive ? "Archive" : "Restore",
          onSelect: () => onGroupStatusChange(group),
          tone: group.isActive ? "danger" : "success",
        },
      ]}
    />
  );
}

function GroupStatusBadge({ group }: { group: GroupListItem }) {
  return (
    <StatusBadge
      label={group.isActive ? "Active" : "Archived"}
      tone={group.isActive ? "success" : "danger"}
    />
  );
}
