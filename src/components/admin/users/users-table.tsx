import type { ReactNode } from "react";
import type { Role } from "@/lib/auth/session";
import {
  type UserFilters,
  userRoles,
} from "@/components/admin/users/user-management-types";
import { CheckIcon, CopyIcon, KeyIcon, PencilIcon, XIcon } from "@/components/ui/icons";
import {
  MobileSelectionShell,
  RowSelectionCheckbox,
} from "@/components/ui/bulk-selection-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime } from "@/lib/presentation/formatters";
import type { UserListItem } from "@/domains/users/user-service";

type UsersTableProps = {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onDuplicate: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onPasswordReset: (user: UserListItem) => void;
  onShowInactiveUsersChange: (showInactiveUsers: boolean) => void;
  onUserSelectionChange: (userId: string, isSelected: boolean) => void;
  onUserActiveChange: (user: UserListItem, isActive: boolean) => void;
  onVisibleUsersSelectionChange: (isSelected: boolean) => void;
  selectedUserIds: string[];
  showInactiveUsers: boolean;
  toolbar?: ReactNode;
  users: UserListItem[];
};

export function UsersTable({
  filters,
  onFiltersChange,
  onDuplicate,
  onEdit,
  onPasswordReset,
  onShowInactiveUsersChange,
  onUserSelectionChange,
  onUserActiveChange,
  onVisibleUsersSelectionChange,
  selectedUserIds,
  showInactiveUsers,
  toolbar,
  users,
}: UsersTableProps) {
  function updateFilter<Field extends keyof UserFilters>(
    field: Field,
    value: UserFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }
  const areAllVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIds.includes(user.id));

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid gap-3 md:hidden">
        {users.map((user) => (
          <UserCard
            key={user.id}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onPasswordReset={onPasswordReset}
            onSelectionChange={onUserSelectionChange}
            onUserActiveChange={onUserActiveChange}
            selected={selectedUserIds.includes(user.id)}
            user={user}
          />
        ))}
      </div>

      {toolbar && <div className="hidden md:block">{toolbar}</div>}
      <table aria-label="Users" className="hidden w-full table-fixed border-collapse text-left text-sm md:table">
        <colgroup>
          <col className="w-10" />
          <col className="w-[24%]" />
          <col className="w-[14%]" />
          <col className="w-[23%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[7%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th scope="col" className="py-3 pr-3 font-semibold">
              <RowSelectionCheckbox
                checked={areAllVisibleUsersSelected}
                label={
                  areAllVisibleUsersSelected
                    ? "Clear selected users"
                    : "Select all users"
                }
                onChange={onVisibleUsersSelectionChange}
              />
            </th>
            <th scope="col" className="py-3 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.firstName || filters.lastName)}
                label="Name"
                onClear={() =>
                  onFiltersChange({ ...filters, firstName: "", lastName: "" })
                }
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
                isActive={showInactiveUsers}
                label="Status"
                onClear={() => onShowInactiveUsersChange(false)}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    onShowInactiveUsersChange(value === "includeInactive")
                  }
                  options={[
                    { label: "Active only", value: "activeOnly" },
                    { label: "Include inactive", value: "includeInactive" },
                  ]}
                  value={showInactiveUsers ? "includeInactive" : "activeOnly"}
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
              <td className="py-3 pr-3">
                <RowSelectionCheckbox
                  checked={selectedUserIds.includes(user.id)}
                  label={`Select ${user.displayName}`}
                  onChange={(isSelected) =>
                    onUserSelectionChange(user.id, isSelected)
                  }
                />
              </td>
              <td className="py-3 pr-4">
                <UserIdentity user={user} />
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
      </table>
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

function UserActions({
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
    <TableActionMenu
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
          icon: user.isActive ? <XIcon /> : <CheckIcon />,
          label: user.isActive ? "Disable" : "Enable",
          onSelect: () => onUserActiveChange(user, !user.isActive),
          tone: user.isActive ? "danger" : "success",
        },
      ]}
    />
  );
}

function UserIdentity({ user }: { user: UserListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        displayName={user.displayName}
        imageUrl={user.profileImageUrl}
      />
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
      label={isActive ? "Active" : "Inactive"}
      tone={isActive ? "success" : "danger"}
    />
  );
}
