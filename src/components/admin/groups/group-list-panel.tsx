"use client";

import { MobileTableToolbar } from "@/components/ui/mobile-table-toolbar";

import { MobileGroupRow } from "@/components/admin/groups/mobile/group-row";
import { GroupActions } from "@/components/admin/groups/shared/row-actions";

import { useState, type ReactNode } from "react";
import { useTableLayout } from "@/components/ui/use-table-layout";
import {
  CheckIcon,
  XIcon,
} from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveStatusFilterOptions, type ArchiveStatusFilter } from "@/components/ui/archive-status-filter";
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
    <div aria-busy={isLoading}>
      <div>
        {isLoading && totalGroupsCount === 0 && (
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
        {totalGroupsCount > 0 && (
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
            {!isLoading && groups.length === 0 && (
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
  const tableLayout = useTableLayout();
  const selectableGroupIds = groups.map((group) => group.id);
  const areAllVisibleGroupsSelected =
    groups.length > 0 &&
    groups.every((group) => selectedGroupIdSet.has(group.id));

  function updateFilter(field: keyof GroupFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  const tableHeader = (
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
  );

  return (
    <>
      <MobileTableToolbar label="Groups" toolbar={toolbar} header={tableHeader} />
      {tableLayout !== "desktop" && (
        <div className="grid min-w-0 gap-2 md:hidden">
          {groups.map((group) => (
            <MobileGroupRow
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
      )}

      {tableLayout !== "mobile" && (
        <DataTable ariaLabel="Groups" responsive="desktop" toolbar={toolbar}>
          <colgroup>
            <col className="w-10" />
            <col className="w-[28%]" />
            <col />
            <col className="w-28" />
            <col className="w-24" />
            <col className="table-action-column" />
          </colgroup>
          {tableHeader}
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
      )}
    </>
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
