"use client";

import { useEffect, useMemo, useState } from "react";
import { TimetableEntryModal } from "@/components/admin-timetable/timetable-entry-modal";
import { TimetableEntryTable } from "@/components/admin-timetable/timetable-entry-table";
import { downloadTimetableEntries } from "@/components/admin-timetable/timetable-export";
import { TimetableImportModal } from "@/components/admin-timetable/timetable-import-modal";
import {
  defaultTimetableDayIndex,
  weekDays,
} from "@/components/admin-timetable/timetable-constants";
import {
  emptyTimetableFilters,
  type TimetableFiltersState,
} from "@/components/admin-timetable/timetable-types";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import {
  FileDownIcon,
  FileUpIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  listGroups,
  listTimetableEntries,
  listTimetableTeachers,
  updateTimetableEntry,
} from "@/lib/actions";
import type { GroupListItem } from "@/domains/groups/group-service";
import type {
  CreateTimetableEntryInput,
  TimetableEntry,
  TimetableTeacher,
} from "@/domains/timetable/timetable-service";

const emptyEntryForm: CreateTimetableEntryInput = {
  dayOfWeek: defaultTimetableDayIndex,
  endTime: "",
  groupId: "",
  startTime: "",
  teacherUserId: "",
};

export function AdminTimetablePanel() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [form, setForm] =
    useState<CreateTimetableEntryInput>(emptyEntryForm);
  const [filters, setFilters] =
    useState<TimetableFiltersState>(emptyTimetableFilters);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TimetableEntry | null>(null);
  const [deletingEntryIds, setDeletingEntryIds] = useState<string[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.isActive),
    [groups],
  );
  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesTimetableFilters(entry, filters)),
    [entries, filters],
  );
  const {
    page,
    pageItems: visibleEntries,
    setPage,
    totalPages,
  } = usePagedList(filteredEntries);

  useEffect(() => {
    refreshTimetable();
  }, []);

  async function refreshTimetable() {
    setIsLoading(true);

    try {
      const [loadedEntries, loadedTeachers, loadedGroups] = await Promise.all([
        listTimetableEntries(false),
        listTimetableTeachers(),
        listGroups(false),
      ]);

      setEntries(loadedEntries);
      setTeachers(loadedTeachers);
      setGroups(loadedGroups);
      setError(null);
    } catch {
      setError("Could not load timetable.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateEntry() {
    setIsSaving(true);

    const result = await createTimetableEntry(form);

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setForm(emptyEntryForm);
    setIsCreateModalOpen(false);
    setMessage("Timetable entry created.");
    setError(null);
    setIsSaving(false);
    await refreshTimetable();
  }

  async function handleUpdateEntry() {
    if (!editingEntry) {
      return;
    }

    setIsSaving(true);

    const result = await updateTimetableEntry({
      ...form,
      id: editingEntry.id,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setEditingEntry(null);
    setForm(emptyEntryForm);
    setMessage("Timetable entry updated.");
    setError(null);
    setIsSaving(false);
    await refreshTimetable();
  }

  function handleDeleteEntry(entry: TimetableEntry) {
    setDeletingEntry(entry);
  }

  function handleEntrySelectionChange(entryId: string, isSelected: boolean) {
    setSelectedEntryIds((currentEntryIds) =>
      isSelected
        ? [...new Set([...currentEntryIds, entryId])]
        : currentEntryIds.filter((currentEntryId) => currentEntryId !== entryId),
    );
  }

  function handleVisibleEntriesSelectionChange(isSelected: boolean) {
    const visibleEntryIds = visibleEntries.map((entry) => entry.id);

    setSelectedEntryIds((currentEntryIds) =>
      isSelected
        ? [...new Set([...currentEntryIds, ...visibleEntryIds])]
        : currentEntryIds.filter((entryId) => !visibleEntryIds.includes(entryId)),
    );
  }

  function clearTimetableFilters() {
    setFilters(emptyTimetableFilters);
    setSelectedEntryIds([]);
  }

  async function confirmDeleteEntry() {
    if (!deletingEntry) {
      return;
    }

    const result = await deleteTimetableEntry(deletingEntry.id);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDeletingEntry(null);
    setMessage("Timetable entry deleted.");
    setError(null);
    await refreshTimetable();
  }

  async function confirmBulkDeleteEntries() {
    if (deletingEntryIds.length === 0) {
      return;
    }

    for (const entryId of deletingEntryIds) {
      const result = await deleteTimetableEntry(entryId);

      if (!result.ok) {
        setError(result.message);
        return;
      }
    }

    setDeletingEntryIds([]);
    setSelectedEntryIds([]);
    setMessage(`${deletingEntryIds.length} timetable entries deleted.`);
    setError(null);
    await refreshTimetable();
  }

  function handleEditEntry(entry: TimetableEntry) {
    setEditingEntry(entry);
    setForm({
      dayOfWeek: entry.dayOfWeek,
      endTime: entry.endTime,
      groupId: entry.groupId,
      startTime: entry.startTime,
      teacherUserId: entry.teacherUserId,
    });
    setMessage(null);
    setError(null);
  }

  function handleDuplicateEntry(entry: TimetableEntry) {
    setEditingEntry(null);
    setForm({
      dayOfWeek: entry.dayOfWeek,
      endTime: entry.endTime,
      groupId: entry.groupId,
      startTime: entry.startTime,
      teacherUserId: entry.teacherUserId,
    });
    setIsCreateModalOpen(true);
    setMessage(null);
    setError(null);
  }

  function handleNewEntryToggle() {
    setEditingEntry(null);
    setForm(emptyEntryForm);
    setIsCreateModalOpen(true);
  }

  function handleCancelForm() {
    setEditingEntry(null);
    setForm(emptyEntryForm);
    setIsCreateModalOpen(false);
  }

  async function handleTimetableImported(
    messageText: string,
    shouldClose = true,
  ) {
    setMessage(messageText);
    setError(null);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }

    await refreshTimetable();
  }

  return (
    <AdminPageSection isFlush>
      <FixedNotification error={error} message={message} />
      {isCreateModalOpen && (
        <TimetableEntryModal
          form={form}
          groups={activeGroups}
          isSaving={isSaving}
          mode={editingEntry ? "edit" : "create"}
          onCancel={handleCancelForm}
          onChange={setForm}
          onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
          teachers={teachers}
        />
      )}

      {editingEntry && (
        <TimetableEntryModal
          form={form}
          groups={activeGroups}
          isSaving={isSaving}
          mode="edit"
          onCancel={handleCancelForm}
          onChange={setForm}
          onSubmit={handleUpdateEntry}
          teachers={teachers}
        />
      )}

      {isImportModalOpen && (
        <TimetableImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={handleTimetableImported}
        />
      )}

      {deletingEntry && (
        <ConfirmationModal
          confirmLabel="Delete Entry"
          description={`Delete ${deletingEntry.groupName} with ${deletingEntry.teacherName} on ${weekDays[deletingEntry.dayOfWeek]}?`}
          onCancel={() => setDeletingEntry(null)}
          onConfirm={confirmDeleteEntry}
          title="Delete timetable entry"
        />
      )}

      {deletingEntryIds.length > 0 && (
        <ConfirmationModal
          confirmLabel="Delete Entries"
          description={`Delete ${deletingEntryIds.length} selected timetable entries?`}
          onCancel={() => setDeletingEntryIds([])}
          onConfirm={confirmBulkDeleteEntries}
          title="Delete selected timetable entries"
          tone="danger"
        />
      )}

      <div>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading timetable...</p>
        )}
        {!isLoading && error && entries.length === 0 && (
          <LoadFailure
            description="Timetable entries and their supporting lists could not be retrieved."
            onRetry={refreshTimetable}
            title="Could not load the timetable"
          />
        )}
        {!isLoading && !error && entries.length === 0 && (
          <EmptyState
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <IconButton
                  ariaExpanded={isCreateModalOpen}
                  label="Add timetable entry"
                  onClick={handleNewEntryToggle}
                  text="New Entry"
                  tone="primary"
                >
                  <PlusIcon />
                </IconButton>
                <IconButton
                  label="Import timetable: CSV"
                  onClick={() => setIsImportModalOpen(true)}
                  text="Import Timetable: CSV"
                >
                  <FileUpIcon />
                </IconButton>
              </div>
            }
            description="Create a timetable entry or import a CSV to start mapping teachers to groups."
            icon={<PlusIcon />}
            title="No timetable entries yet"
          />
        )}
        {!isLoading && entries.length > 0 && (
          <>
            <TimetableEntryTable
              entries={visibleEntries}
              filters={filters}
              onDeleteEntry={handleDeleteEntry}
              onDuplicateEntry={handleDuplicateEntry}
              onEntrySelectionChange={handleEntrySelectionChange}
              onEditEntry={handleEditEntry}
              onFiltersChange={setFilters}
              onVisibleEntriesSelectionChange={handleVisibleEntriesSelectionChange}
              selectedEntryIds={selectedEntryIds}
              toolbar={
                <TableToolbar
                  actions={
                    <>
                      <IconButton
                        ariaExpanded={isCreateModalOpen}
                        label="Add timetable entry"
                        onClick={handleNewEntryToggle}
                        text="New Entry"
                        tone="primary"
                      >
                        <PlusIcon />
                      </IconButton>
                      <TableActionMenu
                        label="Open timetable tools"
                        items={[
                          {
                            disabled: filteredEntries.length === 0,
                            icon: <FileDownIcon />,
                            label: "Export timetable: CSV",
                            onSelect: () =>
                              downloadTimetableEntries(filteredEntries),
                          },
                          {
                            icon: <FileUpIcon />,
                            label: "Import timetable: CSV",
                            onSelect: () => setIsImportModalOpen(true),
                          },
                        ]}
                      />
                    </>
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-text-muted">
                      Showing {visibleEntries.length} of {filteredEntries.length} timetable entries.
                    </p>
                    <BulkSelectionControls
                      actions={[
                        {
                          icon: <TrashIcon />,
                          label: "Delete selected",
                          onSelect: () => setDeletingEntryIds(selectedEntryIds),
                          tone: "danger",
                        },
                      ]}
                      allSelectedLabel="Select all timetable entries"
                      isAllSelected={
                        visibleEntries.length > 0 &&
                        visibleEntries.every((entry) =>
                          selectedEntryIds.includes(entry.id),
                        )
                      }
                      onVisibleSelectionChange={
                        handleVisibleEntriesSelectionChange
                      }
                      selectedCount={selectedEntryIds.length}
                    />
                  </div>
                </TableToolbar>
              }
            />
            {filteredEntries.length === 0 && (
              <EmptyState
                action={
                  <IconButton
                    label="Clear timetable filters"
                    onClick={clearTimetableFilters}
                    text="Clear Filters"
                  >
                    <XIcon />
                  </IconButton>
                }
                description="Try changing or clearing the filters to see more timetable entries."
                icon={<PlusIcon />}
                title="No matching timetable entries"
              />
            )}
            {filteredEntries.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                page={page}
                totalCount={filteredEntries.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>
    </AdminPageSection>
  );
}

function matchesTimetableFilters(
  entry: TimetableEntry,
  filters: TimetableFiltersState,
) {
  return (
    includesFilter(entry.teacherName, filters.teacherName) &&
    includesFilter(entry.groupName, filters.groupName) &&
    (!filters.dayOfWeek || entry.dayOfWeek === Number(filters.dayOfWeek)) &&
    (!filters.status ||
      (filters.status === "active" ? entry.isActive : !entry.isActive))
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
