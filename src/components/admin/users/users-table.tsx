import { memo, type ReactNode } from "react";
import { useTableLayout } from "@/components/ui/use-table-layout";
import type { Role } from "@/lib/auth/session";
import {
  type UserFilters,
  userRoles,
} from "@/components/admin/users/user-management-types";
import { CheckIcon, CopyIcon, KeyIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import {
  MobileSelectionShell,
  RowSelectionCheckbox,
} from "@/components/ui/bulk-selection-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActionGrid } from "@/components/ui/table-action-grid";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DataTable,
  DataTableSelectionCell,
  DataTableSelectionHeader,
} from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/presentation/formatters";
import type { UserListItem } from "@/domains/users/user-service";
import type { TableSortDirection } from "@/components/ui/table-sorting";
import { archiveStatusFilterOptions, type ArchiveStatusFilter } from "@/components/ui/archive-status-filter";

type UsersTableProps = {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onDuplicate: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onPasswordReset: (user: UserListItem) => void;
  onStatusFilterChange: (status: ArchiveStatusFilter) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  onUserSelectionChange: (userId: string, isSelected: boolean) => void;
  onUserActiveChange: (user: UserListItem, isActive: boolean) => void;
  onVisibleUsersSelectionChange: (isSelected: boolean) => void;
  selectedUserIds: string[];
  statusFilter: ArchiveStatusFilter;
  tableSort: { column: string; direction: TableSortDirection } | null;
  toolbar?: ReactNode;
  users: UserListItem[];
};

export function UsersTable({
  filters,
  onFiltersChange,
  onDuplicate,
  onEdit,
  onPasswordReset,
  onStatusFilterChange,
  onSortChange,
  onUserSelectionChange,
  onUserActiveChange,
  onVisibleUsersSelectionChange,
  selectedUserIds,
  statusFilter,
  tableSort,
  toolbar,
  users,
}: UsersTableProps) {
  const selectedUserIdSet = new Set(selectedUserIds);
  const tableLayout = useTableLayout();
  const selectableUserIds = users.map((user) => user.id);

  function updateFilter<Field extends keyof UserFilters>(
    field: Field,
    value: UserFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }
  const areAllVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIdSet.has(user.id));

  return (
    <>
      {tableLayout !== "desktop" && toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      {tableLayout !== "desktop" && (
        <div className="grid gap-3 md:hidden">
          {users.map((user) => (
            <UserCard
              key={user.id}
              onDuplicate={onDuplicate}
              onEdit={onEdit}
              onPasswordReset={onPasswordReset}
              onSelectionChange={onUserSelectionChange}
              onUserActiveChange={onUserActiveChange}
              selected={selectedUserIdSet.has(user.id)}
              user={user}
            />
          ))}
        </div>
      )}

      {tableLayout !== "mobile" && (
        <DataTable ariaLabel="Users" responsive="desktop" toolbar={toolbar}>
          <colgroup>
            <col className="w-10" />
            <col className="w-14" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-24" />
            <col className="table-action-column" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <DataTableSelectionHeader
                checked={areAllVisibleUsersSelected}
                label={
                  areAllVisibleUsersSelected
                    ? "Clear selected users"
                    : "Select all users"
                }
                onChange={onVisibleUsersSelectionChange}
              />
              <th scope="col" className="py-3 pr-3 text-center font-semibold">
                <span className="sr-only">Photo</span>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.firstName || filters.lastName)}
                  label="Name"
                  onClear={() =>
                    onFiltersChange({ ...filters, firstName: "", lastName: "" })
                  }
                  onSortDirectionChange={(direction) => onSortChange("name", direction)}
                  sortDirection={tableSort?.column === "name" ? tableSort.direction : null}
                >
                  <div className="grid gap-3">
                    <TableHeaderFilterInput
                      label="First name"
                      onChange={(value) => updateFilter("firstName", value)}
                      value={filters.firstName}
                    />
                    <TableHeaderFilterInput
                      label="Last name"
                      onChange={(value) => updateFilter("lastName", value)}
                      value={filters.lastName}
                    />
                  </div>
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.username)}
                  label="Username"
                  onClear={() => updateFilter("username", "")}
                  onSortDirectionChange={(direction) => onSortChange("username", direction)}
                  sortDirection={tableSort?.column === "username" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Username"
                    onChange={(value) => updateFilter("username", value)}
                    value={filters.username}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.email)}
                  label="Email"
                  onClear={() => updateFilter("email", "")}
                  onSortDirectionChange={(direction) => onSortChange("email", direction)}
                  sortDirection={tableSort?.column === "email" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Email"
                    onChange={(value) => updateFilter("email", value)}
                    value={filters.email}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.role)}
                  label="Role"
                  onClear={() => updateFilter("role", "")}
                  onSortDirectionChange={(direction) => onSortChange("role", direction)}
                  sortDirection={tableSort?.column === "role" ? tableSort.direction : null}
                >
                  <TableHeaderFilterSelect
                    label="Role"
                    onChange={(value) => updateFilter("role", value as Role | "")}
                    options={[
                      { label: "Any role", value: "" },
                      ...userRoles.map((role) => ({
                        label: role,
                        value: role,
                      })),
                    ]}
                    value={filters.role}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.lastActivity)}
                  label="Last activity"
                  onClear={() => updateFilter("lastActivity", "")}
                  onSortDirectionChange={(direction) => onSortChange("activity", direction)}
                  sortDirection={tableSort?.column === "activity" ? tableSort.direction : null}
                >
                  <TableHeaderFilterSelect
                    label="Last activity"
                    onChange={(value) =>
                      updateFilter(
                        "lastActivity",
                        value as UserFilters["lastActivity"],
                      )
                    }
                    options={[
                      { label: "Any activity", value: "" },
                      { label: "Has activity", value: "active" },
                      { label: "Never active", value: "never" },
                    ]}
                    value={filters.lastActivity}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
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
              <th scope="col" className="py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-b border-border-subtle" key={user.id}>
                <DataTableSelectionCell
                  checked={selectedUserIdSet.has(user.id)}
                  label={`Select ${user.displayName}`}
                  rangeKey="users-table"
                  rowId={user.id}
                  selectableRowIds={selectableUserIds}
                  onRangeChange={(ids, isSelected) =>
                    ids.forEach((id) => onUserSelectionChange(id, isSelected))
                  }
                  onChange={(isSelected) =>
                    onUserSelectionChange(user.id, isSelected)
                  }
                />
                <td className="py-3 pr-3">
                  <div className="flex justify-center">
                    <UserAvatar
                      displayName={user.displayName}
                      imageUrl={user.profileImageUrl}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <UserName user={user} />
                </td>
                <td className="py-3 pr-4 text-text-muted">{user.username}</td>
                <td className="py-3 pr-4 text-text-muted">{user.email}</td>
                <td className="py-3 pr-4 capitalize text-text-muted">{user.role}</td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatLastActivity(user.lastActivityAt)}
                </td>
                <td className="py-3 pr-4">
                  <UserStatusBadge isActive={user.isActive} />
                </td>
                <td className="py-3 text-right">
                  <UserActions
                    onDuplicate={onDuplicate}
                    onEdit={onEdit}
                    onPasswordReset={onPasswordReset}
                    onUserActiveChange={onUserActiveChange}
                    user={user}
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

function UserCard({
  onDuplicate,
  onEdit,
  onPasswordReset,
  onSelectionChange,
  onUserActiveChange,
  selected,
  user,
}: {
  onDuplicate: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onPasswordReset: (user: UserListItem) => void;
  onSelectionChange: (userId: string, isSelected: boolean) => void;
  onUserActiveChange: (user: UserListItem, isActive: boolean) => void;
  selected: boolean;
  user: UserListItem;
}) {
  return (
    <article className="theme-card p-3">
      <MobileSelectionShell
        checkbox={
          <RowSelectionCheckbox
            checked={selected}
            label={`Select ${user.displayName}`}
            onChange={(isSelected) => onSelectionChange(user.id, isSelected)}
          />
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              displayName={user.displayName}
              imageUrl={user.profileImageUrl}
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{user.displayName}</h3>
              <p className="truncate text-sm text-text-muted">{user.username}</p>
            </div>
          </div>
          <UserActions
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onPasswordReset={onPasswordReset}
            onUserActiveChange={onUserActiveChange}
            user={user}
          />
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <p className="truncate text-text-muted">{user.email}</p>
          <p className="truncate text-text-muted">
            Last activity: {formatLastActivity(user.lastActivityAt)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="capitalize text-text-muted">{user.role}</span>
            <UserStatusBadge isActive={user.isActive} />
          </div>
        </div>
      </MobileSelectionShell>
    </article>
  );
}

const UserActions = memo(function UserActions({
  onDuplicate,
  onEdit,
  onPasswordReset,
  onUserActiveChange,
  user,
}: {
  onDuplicate: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onPasswordReset: (user: UserListItem) => void;
  onUserActiveChange: (user: UserListItem, isActive: boolean) => void;
  user: UserListItem;
}) {
  return (
    <TableActionGrid
      label={`Open actions for ${user.displayName}`}
      items={[
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicate(user),
        },
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEdit(user),
        },
        {
          icon: <KeyIcon />,
          label: "Reset Password",
          onSelect: () => onPasswordReset(user),
        },
        {
          icon: user.isActive ? <TrashIcon /> : <CheckIcon />,
          label: user.isActive ? "Archive" : "Restore",
          onSelect: () => onUserActiveChange(user, !user.isActive),
          tone: user.isActive ? "danger" : "success",
        },
      ]}
    />
  );
});

function UserName({ user }: { user: UserListItem }) {
  return (
    <div className="min-w-0">
      <span className="truncate font-semibold text-text-control">{user.displayName}</span>
    </div>
  );
}

function formatLastActivity(value: string | null) {
  return value ? formatDateTime(value) : "-";
}

function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      label={isActive ? "Active" : "Archived"}
      tone={isActive ? "success" : "danger"}
    />
  );
}
