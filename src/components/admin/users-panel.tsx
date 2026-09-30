"use client";

import { useEffect, useMemo, useState } from "react";
import { listUsers, setUserActive } from "@/lib/actions";
import { matchesUserFilters } from "@/components/admin/users/user-filter-utils";
import {
  emptyFilters,
  type UserFilters,
} from "@/components/admin/users/user-management-types";
import { UserImportModal } from "@/components/admin/users/user-import-modal";
import { UserModal } from "@/components/admin/users/user-modal";
import { ResetUserPasswordModal } from "@/components/admin/users/reset-user-password-modal";
import { UsersTable } from "@/components/admin/users/users-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import {
  CheckIcon,
  FileDownIcon,
  FileUpIcon,
  PlusIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { downloadCsv } from "@/lib/csv/client";
import { formatDateTime } from "@/lib/presentation/formatters";
import type { UserListItem } from "@/domains/users/user-service";
import type { UserFormState } from "@/components/admin/users/user-modal-types";

type AdminUsersPanelProps = {
  schoolName: string;
};

export function AdminUsersPanel({ schoolName }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [duplicatingUserForm, setDuplicatingUserForm] =
    useState<Partial<UserFormState> | null>(null);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] =
    useState<UserListItem | null>(null);
  const [pendingUserStatusChange, setPendingUserStatusChange] = useState<{
    isActive: boolean;
    user: UserListItem;
  } | null>(null);
  const [pendingBulkUserStatusChange, setPendingBulkUserStatusChange] =
    useState<{
      isActive: boolean;
      userIds: string[];
    } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshUsers() {
    setIsLoading(true);

    try {
      const loadedUsers = await listUsers();

      setUsers(loadedUsers);
      setError(null);
    } catch {
      setError("Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const loadedUsers = await listUsers();

        if (isMounted) {
          setUsers(loadedUsers);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load users.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleUserSaved(messageText: string) {
    setDuplicatingUserForm(null);
    setEditingUser(null);
    setIsCreateModalOpen(false);
    setMessage(messageText);
    refreshUsers();
  }

  function handleDuplicateUser(user: UserListItem) {
    setEditingUser(null);
    setDuplicatingUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      cardNumber: user.cardNumber,
      role: user.role,
    });
    setIsCreateModalOpen(true);
  }

  function handleUsersImported(messageText: string, shouldClose = true) {
    setMessage(messageText);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }
  }

  function handleSetUserActive(user: UserListItem, isActive: boolean) {
    setPendingUserStatusChange({ isActive, user });
  }

  function handleUserSelectionChange(userId: string, isSelected: boolean) {
    setSelectedUserIds((currentUserIds) =>
      isSelected
        ? [...new Set([...currentUserIds, userId])]
        : currentUserIds.filter((currentUserId) => currentUserId !== userId),
    );
  }

  function handleVisibleUsersSelectionChange(isSelected: boolean) {
    const visibleUserIds = visibleUsers.map((user) => user.id);

    setSelectedUserIds((currentUserIds) =>
      isSelected
        ? [...new Set([...currentUserIds, ...visibleUserIds])]
        : currentUserIds.filter((userId) => !visibleUserIds.includes(userId)),
    );
  }

  async function confirmSetUserActive() {
    if (!pendingUserStatusChange) {
      return;
    }

    setError(null);
    setMessage(null);

    const result = await setUserActive(
      pendingUserStatusChange.user.id,
      pendingUserStatusChange.isActive,
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(
      pendingUserStatusChange.isActive ? "User enabled." : "User disabled.",
    );
    setPendingUserStatusChange(null);
    await refreshUsers();
  }

  async function confirmBulkSetUserActive() {
    if (!pendingBulkUserStatusChange) {
      return;
    }

    setError(null);
    setMessage(null);

    for (const userId of pendingBulkUserStatusChange.userIds) {
      const result = await setUserActive(
        userId,
        pendingBulkUserStatusChange.isActive,
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }
    }

    setMessage(
      `${pendingBulkUserStatusChange.userIds.length} users ${
        pendingBulkUserStatusChange.isActive ? "enabled" : "disabled"
      }.`,
    );
    setPendingBulkUserStatusChange(null);
    setSelectedUserIds([]);
    await refreshUsers();
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesUserFilters(user, filters, showInactiveUsers),
      ),
    [filters, showInactiveUsers, users],
  );
  const {
    page,
    pageItems: visibleUsers,
    setPage,
    totalPages,
  } = usePagedList(filteredUsers);

  function clearUserFilters() {
    setFilters(emptyFilters);
    setShowInactiveUsers(false);
    setSelectedUserIds([]);
  }

  return (
    <AdminPageSection ariaLabel={`${schoolName} users`} isFlush>
      <FixedNotification error={error} message={message} />
      <div>
        {isLoading && <p className="text-sm text-text-muted">Loading users...</p>}
        {!isLoading && error && users.length === 0 && (
          <LoadFailure
            description="The user directory is temporarily unavailable."
            onRetry={refreshUsers}
            title="Could not load users"
          />
        )}
        {!isLoading && users.length > 0 && (
          <>
            <UsersTable
              filters={filters}
              onFiltersChange={setFilters}
              onDuplicate={handleDuplicateUser}
              onEdit={setEditingUser}
              onPasswordReset={setResettingPasswordUser}
              onShowInactiveUsersChange={setShowInactiveUsers}
              onUserSelectionChange={handleUserSelectionChange}
              onUserActiveChange={handleSetUserActive}
              onVisibleUsersSelectionChange={handleVisibleUsersSelectionChange}
              selectedUserIds={selectedUserIds}
              showInactiveUsers={showInactiveUsers}
              toolbar={
                <TableToolbar
                  actions={
                    <>
                      <IconButton
                        label="New user"
                        onClick={() => setIsCreateModalOpen(true)}
                        text="New User"
                        tone="primary"
                      >
                        <PlusIcon />
                      </IconButton>
                      <TableActionMenu
                        label="Open user table tools"
                        items={[
                          {
                            disabled: filteredUsers.length === 0,
                            icon: <FileDownIcon />,
                            label: "Export users: CSV",
                            onSelect: () => downloadUsers(filteredUsers),
                          },
                          {
                            icon: <FileUpIcon />,
                            label: "Import users: CSV",
                            onSelect: () => setIsImportModalOpen(true),
                          },
                        ]}
                      />
                    </>
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <ListCount
                      count={visibleUsers.length}
                      label="users"
                      totalCount={filteredUsers.length}
                    />
                    <BulkSelectionControls
                      actions={[
                        {
                          icon: <CheckIcon />,
                          label: "Enable selected",
                          onSelect: () =>
                            setPendingBulkUserStatusChange({
                              isActive: true,
                              userIds: selectedUserIds,
                            }),
                          tone: "primary",
                        },
                        {
                          icon: <XIcon />,
                          label: "Disable selected",
                          onSelect: () =>
                            setPendingBulkUserStatusChange({
                              isActive: false,
                              userIds: selectedUserIds,
                            }),
                          tone: "danger",
                        },
                      ]}
                      allSelectedLabel="Select all users"
                      isAllSelected={
                        visibleUsers.length > 0 &&
                        visibleUsers.every((user) =>
                          selectedUserIds.includes(user.id),
                        )
                      }
                      onVisibleSelectionChange={
                        handleVisibleUsersSelectionChange
                      }
                      selectedCount={selectedUserIds.length}
                    />
                  </div>
                </TableToolbar>
              }
              users={visibleUsers}
            />
            {filteredUsers.length === 0 && (
              <EmptyState
                action={
                  <IconButton
                    label="Clear user filters"
                    onClick={clearUserFilters}
                    text="Clear Filters"
                  >
                    <XIcon />
                  </IconButton>
                }
                description="Try changing or clearing the filters to see more accounts."
                icon={<UsersIcon />}
                title="No matching users"
              />
            )}
            {filteredUsers.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                page={page}
                totalCount={filteredUsers.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
        {!isLoading && !error && users.length === 0 && (
          <EmptyState
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <IconButton
                  label="New user"
                  onClick={() => setIsCreateModalOpen(true)}
                  text="New User"
                  tone="primary"
                >
                  <PlusIcon />
                </IconButton>
                <IconButton
                  label="Import users: CSV"
                  onClick={() => setIsImportModalOpen(true)}
                  text="Import Users: CSV"
                >
                  <FileUpIcon />
                </IconButton>
              </div>
            }
            description="Add a user or import a CSV to start setting up accounts."
            icon={<UsersIcon />}
            title="No users yet"
          />
        )}
      </div>

      {isCreateModalOpen && (
        <UserModal
          initialForm={duplicatingUserForm ?? undefined}
          mode="create"
          onClose={() => {
            setDuplicatingUserForm(null);
            setIsCreateModalOpen(false);
          }}
          onSaved={() => handleUserSaved("User created.")}
        />
      )}

      {isImportModalOpen && (
        <UserImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshUsers}
          onImported={handleUsersImported}
        />
      )}

      {editingUser && (
        <UserModal
          mode="edit"
          onClose={() => setEditingUser(null)}
          onSaved={() => handleUserSaved("User updated.")}
          user={editingUser}
        />
      )}

      {resettingPasswordUser && (
        <ResetUserPasswordModal
          onClose={() => setResettingPasswordUser(null)}
          onReset={() => {
            setResettingPasswordUser(null);
            setMessage("Password reset.");
          }}
          user={resettingPasswordUser}
        />
      )}

      {pendingUserStatusChange && (
        <ConfirmationModal
          confirmLabel={
            pendingUserStatusChange.isActive ? "Enable User" : "Disable User"
          }
          description={`${pendingUserStatusChange.isActive ? "Enable" : "Disable"} ${pendingUserStatusChange.user.displayName}?`}
          onCancel={() => setPendingUserStatusChange(null)}
          onConfirm={confirmSetUserActive}
          title={
            pendingUserStatusChange.isActive
              ? "Enable user account"
              : "Disable user account"
          }
          tone={pendingUserStatusChange.isActive ? "primary" : "danger"}
        />
      )}

      {pendingBulkUserStatusChange && (
        <ConfirmationModal
          confirmLabel={
            pendingBulkUserStatusChange.isActive
              ? "Enable Users"
              : "Disable Users"
          }
          description={`${pendingBulkUserStatusChange.isActive ? "Enable" : "Disable"} ${pendingBulkUserStatusChange.userIds.length} selected users?`}
          onCancel={() => setPendingBulkUserStatusChange(null)}
          onConfirm={confirmBulkSetUserActive}
          title={
            pendingBulkUserStatusChange.isActive
              ? "Enable selected users"
              : "Disable selected users"
          }
          tone={pendingBulkUserStatusChange.isActive ? "primary" : "danger"}
        />
      )}
    </AdminPageSection>
  );
}

function ListCount({
  count,
  label,
  totalCount,
}: {
  count: number;
  label: string;
  totalCount: number;
}) {
  return (
    <p className="text-sm font-semibold text-text-muted">
      Showing {count} of {totalCount} {label}.
    </p>
  );
}

function downloadUsers(users: UserListItem[]) {
  downloadCsv(
    "users.csv",
    [
      "id",
      "username",
      "first_name",
      "last_name",
      "display_name",
      "email",
      "card_number",
      "role",
      "status",
      "last_activity",
      "profile_image_url",
    ],
    users.map((user) => [
      user.id,
      user.username,
      user.firstName,
      user.lastName,
      user.displayName,
      user.email,
      user.cardNumber,
      user.role,
      user.isActive ? "active" : "inactive",
      user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "",
      user.profileImageUrl,
    ]),
  );
}
