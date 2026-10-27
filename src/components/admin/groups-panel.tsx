"use client";

import { PageResultCount } from "@/components/ui/page-result-count";
import { matchesTextSearch as includesFilter } from "@/lib/presentation/search";
import { searchDebounceMilliseconds } from "@/lib/presentation/search";

import { useEffect, useMemo, useState } from "react";
import {
  addStudentsToGroup,
  listGroupMembers,
  listGroups,
  removeStudentFromGroup,
  removeStudentsFromGroup,
  searchStudents,
  setGroupActive,
} from "@/lib/actions";
import { GroupDetailsPanel } from "@/components/admin/groups/group-details-panel";
import { GroupEditModal } from "@/components/admin/groups/group-edit-modal";
import { GroupImportModal } from "@/components/admin/groups/group-import-modal";
import { GroupListPanel } from "@/components/admin/groups/group-list-panel";
import { GroupMembersModal } from "@/components/admin/groups/group-members-modal";
import { GroupModal } from "@/components/admin/groups/group-modal";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import {
  CheckIcon,
  FileDownIcon,
  FileUpIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { updateSelectedIds } from "@/components/ui/selection-utils";
import { showToast } from "@/components/ui/toast-viewport";
import { downloadCsv } from "@/lib/csv/client";
import { formatDateTime } from "@/lib/presentation/formatters";
import { archiveBulkActionsForFilter, matchesArchiveStatus, type ArchiveStatusFilter } from "@/components/ui/archive-status-filter";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/domains/groups/group-service";
import type { StudentListItem } from "@/domains/users/user-service";

const studentSearchDebounceMs = searchDebounceMilliseconds;
const emptyStudents: StudentListItem[] = [];

type GroupFilters = {
  description: string;
  memberMax: string;
  memberMin: string;
  name: string;
};

const emptyGroupFilters: GroupFilters = {
  description: "",
  memberMax: "",
  memberMin: "",
  name: "",
};

export function AdminGroupsPanel() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [groupFilters, setGroupFilters] =
    useState<GroupFilters>(emptyGroupFilters);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] =
    useState<StudentListItem[]>(emptyStudents);
  const [groupStatusFilter, setGroupStatusFilter] = useState<ArchiveStatusFilter>("active");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentListItem[]>(
    emptyStudents,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [duplicatingGroup, setDuplicatingGroup] =
    useState<GroupListItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<GroupListItem | null>(null);
  const [editingMembersGroup, setEditingMembersGroup] =
    useState<GroupListItem | null>(null);
  const [pendingGroupStatusChange, setPendingGroupStatusChange] =
    useState<GroupListItem | null>(null);
  const [pendingBulkGroupStatusChange, setPendingBulkGroupStatusChange] =
    useState<{
      groupIds: string[];
      isActive: boolean;
    } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [isChangingGroupStatus, setIsChangingGroupStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const memberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );
  const availableStudentResults = studentResults.filter(
    (student) => !memberIds.has(student.id),
  );
  const filteredGroups = groups.filter(
    (group) =>
      matchesGroupFilters(group, groupFilters) &&
      matchesArchiveStatus(group.isActive, groupStatusFilter),
  );
  const selectedGroupIdSet = useMemo(
    () => new Set(selectedGroupIds),
    [selectedGroupIds],
  );

  useEffect(() => {
    let isActive = true;

    async function loadGroups() {
      setIsLoadingGroups(true);

      try {
        const loadedGroups = await listGroups(groupStatusFilter !== "active");

        if (isActive) {
          setGroups(loadedGroups);
          setSelectedGroupId((currentGroupId) =>
            loadedGroups.some((group) => group.id === currentGroupId)
              ? currentGroupId
              : "",
          );
          if (loadedGroups.length === 0) {
            setMembers([]);
          }
          setError(null);
        }
      } catch {
        if (isActive) {
          setError("Could not load groups.");
        }
      } finally {
        if (isActive) {
          setIsLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      isActive = false;
    };
  }, [groupStatusFilter]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    refreshMembers(selectedGroupId);
  }, [selectedGroupId]);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingStudents(true);

      try {
        const students = await searchStudents(studentQuery);

        if (isActive) {
          setStudentResults(students);
          setError(null);
        }
      } catch {
        if (isActive) {
          setStudentResults(emptyStudents);
          setError("Could not search students.");
        }
      } finally {
        if (isActive) {
          setIsSearchingStudents(false);
        }
      }
    }, studentSearchDebounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [studentQuery]);

  async function refreshGroups() {
    setIsLoadingGroups(true);

    try {
      const loadedGroups = await listGroups(groupStatusFilter !== "active");

      setGroups(loadedGroups);
      setSelectedGroupId((currentGroupId) =>
        loadedGroups.some((group) => group.id === currentGroupId)
          ? currentGroupId
          : "",
      );
      if (loadedGroups.length === 0) {
        setMembers([]);
      }
      setError(null);
    } catch {
      setError("Could not load groups.");
    } finally {
      setIsLoadingGroups(false);
    }
  }

  async function refreshMembers(groupId: string) {
    setIsLoadingMembers(true);

    try {
      const loadedMembers = await listGroupMembers(groupId);

      setMembers(loadedMembers);
      setSelectedMemberIds([]);
      setError(null);
    } catch {
      setError("Could not load group members.");
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleGroupCreated() {
    setDuplicatingGroup(null);
    setIsCreateModalOpen(false);
    setMessage("Group created.");
    setError(null);
    await refreshGroups();
  }

  async function handleGroupsImported(messageText: string, shouldClose = true) {
    setMessage(messageText);
    setError(null);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }

    await refreshGroups();
    if (selectedGroupId) {
      await refreshMembers(selectedGroupId);
    }
  }

  async function handleGroupUpdated() {
    setEditingGroup(null);
    closeGroupDetails();
    setMessage("Group updated.");
    setError(null);
    await refreshGroups();
  }
  
  async function handleAddSelectedStudents() {
    if (!selectedGroupId || selectedStudentIds.length === 0) {
      setError("Select a group and at least one student.");
      return;
    }

    const result = await addStudentsToGroup({
      groupId: selectedGroupId,
      userIds: selectedStudentIds,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${selectedStudentIds.length} students added to ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    clearSelectedStudents();
    setStudentQuery("");
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleRemoveStudent(member: GroupMemberItem) {
    if (!selectedGroupId) {
      return;
    }

    const result = await removeStudentFromGroup(selectedGroupId, member.id);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${member.displayName} removed from ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleRemoveSelectedMembers() {
    if (!selectedGroupId || selectedMemberIds.length === 0) {
      setError("Select at least one group member.");
      return;
    }

    const result = await removeStudentsFromGroup({
      groupId: selectedGroupId,
      userIds: selectedMemberIds,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${selectedMemberIds.length} students removed from ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    setSelectedMemberIds([]);
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  function handleGroupStatusChange(group: GroupListItem) {
    setPendingGroupStatusChange(group);
  }

  function handleGroupSelectionChange(groupId: string, isSelected: boolean) {
    setSelectedGroupIds((currentGroupIds) =>
      updateSelectedIds(currentGroupIds, [groupId], isSelected),
    );
  }

  function handleVisibleGroupsSelectionChange(isSelected: boolean) {
    const visibleGroupIds = filteredGroups.map((group) => group.id);

    setSelectedGroupIds((currentGroupIds) =>
      updateSelectedIds(currentGroupIds, visibleGroupIds, isSelected),
    );
  }

  async function confirmGroupStatusChange() {
    if (!pendingGroupStatusChange) {
      return;
    }

    const group = pendingGroupStatusChange;
    const nextActiveState = !group.isActive;
    setIsChangingGroupStatus(true);
    const result = await setGroupActive(group.id, nextActiveState);

    if (!result.ok) {
      setError(result.message);
      setIsChangingGroupStatus(false);
      return;
    }

    if (nextActiveState) {
      setMessage("Group reactivated.");
    } else {
      setMessage(null);
      showToast({
        action: {
          label: "Undo",
          onSelect: async () => {
            const undoResult = await setGroupActive(group.id, true);
            if (!undoResult.ok) {
              showToast({ text: undoResult.message, tone: "error" });
              return;
            }
            await refreshGroups();
            showToast({ text: "Group restored." });
          },
        },
        text: "Group archived.",
      });
    }
    setError(null);
    setPendingGroupStatusChange(null);
    if (!nextActiveState && groupStatusFilter === "active" && selectedGroupId === group.id) {
      setEditingGroup(null);
      setSelectedGroupId("");
      setMembers([]);
    }
    setIsChangingGroupStatus(false);
    await refreshGroups();
  }

  async function confirmBulkGroupStatusChange() {
    if (!pendingBulkGroupStatusChange) {
      return;
    }

    for (const groupId of pendingBulkGroupStatusChange.groupIds) {
      const result = await setGroupActive(
        groupId,
        pendingBulkGroupStatusChange.isActive,
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }
    }

    setMessage(
      `${pendingBulkGroupStatusChange.groupIds.length} groups ${
        pendingBulkGroupStatusChange.isActive ? "reactivated" : "archived"
      }.`,
    );
    setError(null);
    setPendingBulkGroupStatusChange(null);
    setSelectedGroupIds([]);
    if (!pendingBulkGroupStatusChange.isActive) {
      setSelectedGroupId("");
      setMembers([]);
    }
    await refreshGroups();
  }

  function toggleSelectedStudent(student: StudentListItem) {
    setSelectedStudentIds((current) =>
      current.includes(student.id)
        ? current.filter((id) => id !== student.id)
        : [...current, student.id],
    );
    setSelectedStudents((current) =>
      current.some((selectedStudent) => selectedStudent.id === student.id)
        ? current.filter((selectedStudent) => selectedStudent.id !== student.id)
        : [...current, student],
    );
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
    setSelectedStudents([]);
  }

  function toggleSelectedMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function selectGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setDuplicatingGroup(null);
    setEditingGroup(null);
    setEditingMembersGroup(null);
    setSelectedGroupId(group.id);
  }

  function editGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setStudentQuery("");
    setDuplicatingGroup(null);
    setEditingMembersGroup(null);
    setEditingGroup(group);
    setSelectedGroupId(group.id);
  }

  function editGroupMembers(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setStudentQuery("");
    setDuplicatingGroup(null);
    setEditingGroup(null);
    setEditingMembersGroup(group);
    setSelectedGroupId(group.id);
    void refreshMembers(group.id);
  }

  function duplicateGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setStudentQuery("");
    setEditingGroup(null);
    setEditingMembersGroup(null);
    setSelectedGroupId("");
    setDuplicatingGroup(group);
    setIsCreateModalOpen(true);
  }

  function closeGroupDetails() {
    setSelectedGroupId("");
    setMembers([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setStudentQuery("");
  }

  function closeGroupEdit() {
    setEditingGroup(null);
    closeGroupDetails();
  }

  function closeGroupMembers() {
    setEditingMembersGroup(null);
    closeGroupDetails();
  }

  function handleGroupStatusFilterChange(status: ArchiveStatusFilter) {
    setMembers([]);
    setSelectedGroupId("");
    setSelectedGroupIds([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setGroupStatusFilter(status);
  }

  function clearGroupFilters() {
    setGroupFilters(emptyGroupFilters);
    setMembers([]);
    setSelectedGroupId("");
    setSelectedGroupIds([]);
    setSelectedMemberIds([]);
    clearSelectedStudents();
    setGroupStatusFilter("active");
  }

  function handleStudentQueryChange(value: string) {
    setStudentQuery(value);
  }

  return (
    <AdminPageSection isFlush>
      <FixedNotification error={error} message={message} />
      <GroupListPanel
        emptyAction={
          groups.length === 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              <IconButton
                label="New group"
                onClick={() => {
                  setDuplicatingGroup(null);
                  setIsCreateModalOpen(true);
                }}
                text="New Group"
                tone="primary"
              >
                <PlusIcon />
              </IconButton>
              <IconButton
                label="Import groups: CSV"
                onClick={() => setIsImportModalOpen(true)}
                text="Import Groups: CSV"
              >
                <FileUpIcon />
              </IconButton>
            </div>
          ) : undefined
        }
        groups={filteredGroups}
        hasActiveFilters={Boolean(
          groupFilters.name ||
            groupFilters.description ||
            groupFilters.memberMin ||
            groupFilters.memberMax ||
            groupStatusFilter !== "active",
        )}
        isLoading={isLoadingGroups}
        onClearFilters={clearGroupFilters}
        onDuplicateGroup={duplicateGroup}
        onEditGroup={editGroup}
        onEditMembers={editGroupMembers}
        onGroupSelect={selectGroup}
        onGroupSelectionChange={handleGroupSelectionChange}
        onGroupStatusChange={handleGroupStatusChange}
        onVisibleGroupsSelectionChange={handleVisibleGroupsSelectionChange}
        onFiltersChange={setGroupFilters}
        onStatusFilterChange={handleGroupStatusFilterChange}
        filters={groupFilters}
        selectedGroupId={selectedGroupId}
        selectedGroupIds={selectedGroupIds}
        statusFilter={groupStatusFilter}
        totalGroupsCount={groups.length}
        toolbar={
          <TableToolbar
            actions={
              <>
                <IconButton
                  label="New group"
                  onClick={() => {
                    setDuplicatingGroup(null);
                    setIsCreateModalOpen(true);
                  }}
                  text="New Group"
                  tone="primary"
                >
                  <PlusIcon />
                </IconButton>
                <TableActionMenu
                  label="Open group table tools"
                  items={[
                    {
                      disabled: filteredGroups.length === 0,
                      icon: <FileDownIcon />,
                      label: "Export groups: CSV",
                      onSelect: () => downloadGroups(filteredGroups),
                    },
                    {
                      icon: <FileUpIcon />,
                      label: "Import groups: CSV",
                      onSelect: () => setIsImportModalOpen(true),
                    },
                  ]}
                />
              </>
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {groups.length > 0 && (
                <PageResultCount>
                  Showing {filteredGroups.length} of {groups.length} groups.
                </PageResultCount>
              )}
              <BulkSelectionControls
                actions={archiveBulkActionsForFilter(groupStatusFilter).map((action) =>
                  action === "restore"
                    ? {
                        icon: <CheckIcon />,
                        label: "Restore selected",
                        onSelect: () =>
                          setPendingBulkGroupStatusChange({
                            groupIds: selectedGroupIds,
                            isActive: true,
                          }),
                        tone: "success" as const,
                      }
                    : {
                        icon: <TrashIcon />,
                        label: "Archive selected",
                        onSelect: () =>
                          setPendingBulkGroupStatusChange({
                            groupIds: selectedGroupIds,
                            isActive: false,
                          }),
                        tone: "danger" as const,
                      },
                )}
                allSelectedLabel="Select all groups"
                isAllSelected={
                  filteredGroups.length > 0 &&
                  filteredGroups.every((group) =>
                    selectedGroupIdSet.has(group.id),
                  )
                }
                onVisibleSelectionChange={handleVisibleGroupsSelectionChange}
                selectedCount={selectedGroupIds.length}
              />
            </div>
          </TableToolbar>
        }
      />

      {selectedGroup && !editingGroup && !editingMembersGroup && (
        <GroupDetailsPanel
          isLoadingMembers={isLoadingMembers}
          members={members}
          onClose={closeGroupDetails}
          selectedGroup={selectedGroup}
        />
      )}

      {isCreateModalOpen && (
        <GroupModal
          initialDescription={duplicatingGroup?.description ?? ""}
          initialName={
            duplicatingGroup ? `${duplicatingGroup.name} Copy` : ""
          }
          onClose={() => {
            setDuplicatingGroup(null);
            setIsCreateModalOpen(false);
          }}
          onSaved={handleGroupCreated}
        />
      )}

      {editingGroup && selectedGroup && (
        <GroupEditModal
          group={selectedGroup}
          onClose={closeGroupEdit}
          onSaved={handleGroupUpdated}
        />
      )}

      {editingMembersGroup && selectedGroup && (
        <GroupMembersModal
          availableStudents={availableStudentResults}
          group={selectedGroup}
          isLoadingMembers={isLoadingMembers}
          isSearchingStudents={isSearchingStudents}
          members={members}
          onAddSelectedStudents={handleAddSelectedStudents}
          onClose={closeGroupMembers}
          onMemberSelectionToggle={toggleSelectedMember}
          onRemoveSelectedMembers={handleRemoveSelectedMembers}
          onRemoveStudent={handleRemoveStudent}
          onStudentQueryChange={handleStudentQueryChange}
          onStudentSelectionToggle={toggleSelectedStudent}
          selectedMemberIds={selectedMemberIds}
          selectedStudentIds={selectedStudentIds}
          selectedStudents={selectedStudents}
          studentQuery={studentQuery}
        />
      )}

      {isImportModalOpen && (
        <GroupImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshGroups}
          onImported={handleGroupsImported}
        />
      )}

      {pendingGroupStatusChange && (
        <ConfirmationModal
          confirmLabel={
            pendingGroupStatusChange.isActive
              ? "Archive Group"
              : "Restore Group"
          }
          description={`${pendingGroupStatusChange.isActive ? "Archive" : "Restore"} ${pendingGroupStatusChange.name}?`}
          isConfirming={isChangingGroupStatus}
          onCancel={() => setPendingGroupStatusChange(null)}
          onConfirm={confirmGroupStatusChange}
          title={
            pendingGroupStatusChange.isActive
              ? "Archive group"
              : "Restore group"
          }
          tone={pendingGroupStatusChange.isActive ? "danger" : "success"}
        />
      )}

      {pendingBulkGroupStatusChange && (
        <ConfirmationModal
          confirmLabel={
            pendingBulkGroupStatusChange.isActive
              ? "Restore Groups"
              : "Archive Groups"
          }
          description={`${pendingBulkGroupStatusChange.isActive ? "Restore" : "Archive"} ${pendingBulkGroupStatusChange.groupIds.length} selected groups?`}
          onCancel={() => setPendingBulkGroupStatusChange(null)}
          onConfirm={confirmBulkGroupStatusChange}
          title={
            pendingBulkGroupStatusChange.isActive
              ? "Restore selected groups"
              : "Archive selected groups"
          }
          tone={pendingBulkGroupStatusChange.isActive ? "success" : "danger"}
        />
      )}
    </AdminPageSection>
  );
}

function matchesGroupFilters(group: GroupListItem, filters: GroupFilters) {
  return (
    includesFilter(group.name, filters.name) &&
    includesFilter(group.description, filters.description) &&
    matchesMemberCountFilter(group.memberCount, filters)
  );
}


function matchesMemberCountFilter(
  memberCount: number,
  filters: GroupFilters,
) {
  const minimum = parseNumberFilter(filters.memberMin);
  const maximum = parseNumberFilter(filters.memberMax);

  if (minimum !== null && memberCount < minimum) {
    return false;
  }

  if (maximum !== null && memberCount > maximum) {
    return false;
  }

  return true;
}

function parseNumberFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function downloadGroups(groups: GroupListItem[]) {
  downloadCsv(
    "groups.csv",
    [
      "id",
      "name",
      "description",
      "member_count",
      "status",
      "created_at",
    ],
    groups.map((group) => [
      group.id,
      group.name,
      group.description,
      group.memberCount,
      group.isActive ? "active" : "archived",
      formatDateTime(group.createdAt),
    ]),
  );
}
