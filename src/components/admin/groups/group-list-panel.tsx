"use client";

import type { ReactNode } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PencilIcon,
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
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import type { GroupListItem } from "@/domains/groups/group-service";

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
  onShowArchivedChange: (showArchived: boolean) => void;
  selectedGroupId: string;
  selectedGroupIds: string[];
  showArchived: boolean;
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
  onShowArchivedChange,
  selectedGroupId,
  selectedGroupIds,
  showArchived,
  toolbar,
  totalGroupsCount,
}: GroupListPanelProps) {
  const {
    page,
    pageItems: visibleGroups,
    setPage,
    totalPages,
  } = usePagedList(groups);

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
              onDuplicateGroup={onDuplicateGroup}
              onEditGroup={onEditGroup}
              onEditMembers={onEditMembers}
              onGroupSelect={onGroupSelect}
              onGroupSelectionChange={onGroupSelectionChange}
              onGroupStatusChange={onGroupStatusChange}
              onVisibleGroupsSelectionChange={onVisibleGroupsSelectionChange}
              onFiltersChange={onFiltersChange}
              onShowArchivedChange={onShowArchivedChange}
              selectedGroupId={selectedGroupId}
              selectedGroupIds={selectedGroupIds}
              showArchived={showArchived}
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
                page={page}
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
  onShowArchivedChange,
  selectedGroupId,
  selectedGroupIds,
  showArchived,
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
  onShowArchivedChange: (showArchived: boolean) => void;
  selectedGroupId: string;
  selectedGroupIds: string[];
  showArchived: boolean;
  toolbar?: ReactNode;
}) {
  const areAllVisibleGroupsSelected =
    groups.length > 0 &&
    groups.every((group) => selectedGroupIds.includes(group.id));

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
            selected={selectedGroupIds.includes(group.id)}
          />
        ))}
      </div>

      {toolbar && <div className="hidden md:block">{toolbar}</div>}
      <table aria-label="Groups" className="hidden w-full table-fixed border-collapse text-left text-sm md:table">
        <colgroup>
          <col className="w-10" />
          <col className="w-[28%]" />
          <col className="w-[38%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">
              <RowSelectionCheckbox
                checked={areAllVisibleGroupsSelected}
                label={
                  areAllVisibleGroupsSelected
                    ? "Clear selected groups"
                    : "Select all groups"
                }
                onChange={onVisibleGroupsSelectionChange}
              />
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.name)}
                label="Name"
                onClear={() => updateFilter("name", "")}
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
              >
                <TableHeaderFilterInput
                  label="Search descriptions"
                  onChange={(value) => updateFilter("description", value)}
                  value={filters.description}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
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
                isActive={showArchived}
                label="Status"
                onClear={() => onShowArchivedChange(false)}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    onShowArchivedChange(value === "includeArchived")
                  }
                  options={[
                    { label: "Active only", value: "activeOnly" },
                    { label: "Include archived", value: "includeArchived" },
                  ]}
                  value={showArchived ? "includeArchived" : "activeOnly"}
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
              <td className="py-3 pr-3">
                <RowSelectionCheckbox
                  checked={selectedGroupIds.includes(group.id)}
                  label={`Select ${group.name}`}
                  onChange={(isSelected) =>
                    onGroupSelectionChange(group.id, isSelected)
                  }
                />
              </td>
              <td className="py-3 pr-4 font-semibold">{group.name}</td>
              <td className="py-3 pr-4 text-text-muted">
                {group.description || "-"}
              </td>
              <td className="py-3 pr-4 text-text-muted">
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
      </table>
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
    <TableActionMenu
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
          icon: group.isActive ? <XIcon /> : <CheckIcon />,
          label: group.isActive ? "Archive" : "Reactivate",
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
