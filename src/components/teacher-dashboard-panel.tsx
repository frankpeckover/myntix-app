"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import {
  StudentBalanceCard,
  type StudentBalanceCardStudent,
} from "@/components/student-balance-card";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  PlusIcon,
  SparkleIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { CreditActionControl } from "@/components/ui/credit-action-control";
import { SearchInput } from "@/components/ui/search-input";
import { LoadFailure } from "@/components/ui/load-failure";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import {
  createLedgerAdjustment,
  getCurrentTeacherClass,
  getMyTransactionPresets,
  listGroupMembers,
  listGroups,
  listStudentBalances,
} from "@/lib/actions";
import {
  defaultTransactionPresets,
  getDefaultQuickAdjustments,
  type PersonalTransactionPresets,
} from "@/lib/transaction-presets";
import type { AdjustmentDirection } from "@/components/transactions/ledger-adjustment-types";
import type { GroupListItem } from "@/domains/groups/group-service";
import type { CurrentClass } from "@/domains/timetable/timetable-service";
import type { StudentBalanceItem } from "@/domains/ledger/transaction-service";
import type { StudentListItem } from "@/domains/users/user-service";

type TeacherDashboardPanelProps = {
  currencyName: string;
  groupNavigation?: {
    groupId: string;
    groupName: string;
    version: number;
  } | null;
  onGroupNavigationConsumed?: () => void;
  schoolName: string;
};

type AdjustmentTargetSelection =
  | {
      direction: AdjustmentDirection;
      group: GroupListItem;
      kind: "group";
      version: number;
    }
  | {
      direction: AdjustmentDirection;
      kind: "students";
      students: StudentListItem[];
      version: number;
    };

type StudentDisplayScope = "all-students" | "current-class";

type SelectedGroupView = {
  memberIds: Set<string>;
  name: string;
};

const defaultPersonalPresets: PersonalTransactionPresets = {
  ...defaultTransactionPresets,
  ...getDefaultQuickAdjustments(defaultTransactionPresets),
};

export function TeacherDashboardPanel({
  currencyName,
  groupNavigation,
  onGroupNavigationConsumed,
}: TeacherDashboardPanelProps) {
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalanceItem[]>(
    [],
  );
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGroupView, setSelectedGroupView] =
    useState<SelectedGroupView | null>(null);
  const [studentDisplayScope, setStudentDisplayScope] =
    useState<StudentDisplayScope>("current-class");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [personalPresets, setPersonalPresets] =
    useState<PersonalTransactionPresets>(defaultPersonalPresets);
  const [quickActionStudentId, setQuickActionStudentId] = useState<
    string | null
  >(null);
  const [selection, setSelection] =
    useState<AdjustmentTargetSelection | null>(null);
  const quickActionPendingRef = useRef(false);
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const [currentClassResult, balancesResult, groupsResult, presetsResult] =
          await Promise.allSettled([
            getCurrentTeacherClass(),
            listStudentBalances(),
            listGroups(false),
            getMyTransactionPresets(),
          ]);

        if (currentClassResult.status === "rejected") {
          throw currentClassResult.reason;
        }

        if (balancesResult.status === "rejected") {
          throw balancesResult.reason;
        }

        if (isMounted) {
          setCurrentClass(currentClassResult.value);
          setStudentBalances(
            balancesResult.value.filter((student) => student.isActive),
          );

          if (groupsResult.status === "fulfilled") {
            setGroups(groupsResult.value.filter((group) => group.isActive));
          }

          if (presetsResult.status === "fulfilled") {
            setPersonalPresets(presetsResult.value);
          }

          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load teacher dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const visibleStudents = useMemo(
    () =>
      getVisibleStudents(
        search,
        currentClass,
        studentBalances,
        studentDisplayScope,
        selectedGroupView,
      ),
    [
      currentClass,
      search,
      selectedGroupView,
      studentBalances,
      studentDisplayScope,
    ],
  );
  const visibleGroups = useMemo(
    () => getVisibleGroups(search, groups),
    [groups, search],
  );
  const {
    page: studentPage,
    pageItems: visibleStudentPage,
    setPage: setStudentPage,
    totalPages: studentTotalPages,
  } = usePagedList(visibleStudents);

  useEffect(() => {
    if (!groupNavigation) {
      return;
    }

    const navigation = groupNavigation;
    let isMounted = true;

    async function loadNavigatedGroup() {
      try {
        const members = await listGroupMembers(navigation.groupId);

        if (isMounted) {
          setSearch("");
          setSelectedGroupView({
            memberIds: new Set(members.map((member) => member.id)),
            name: navigation.groupName,
          });
          setStudentPage(1);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError(`Could not load students in ${navigation.groupName}.`);
        }
      } finally {
        if (isMounted) {
          onGroupNavigationConsumed?.();
        }
      }
    }

    loadNavigatedGroup();

    return () => {
      isMounted = false;
    };
  }, [groupNavigation, onGroupNavigationConsumed, setStudentPage]);

  const isDefaultingToCurrentClass =
    search.trim().length === 0 &&
    studentDisplayScope === "current-class" &&
    !selectedGroupView;

  function handleStudentsSelected(
    students: StudentListItem[],
    direction: AdjustmentDirection,
  ) {
    setMessage(null);
    selectionVersionRef.current += 1;
    setSelection({
      direction,
      kind: "students",
      students,
      version: selectionVersionRef.current,
    });
  }

  function handleGroupSelected(
    group: GroupListItem,
    direction: AdjustmentDirection,
  ) {
    setMessage(null);
    selectionVersionRef.current += 1;
    setSelection({
      direction,
      group,
      kind: "group",
      version: selectionVersionRef.current,
    });
  }

  function handleIssueAllShown() {
    if (visibleStudents.length === 0) {
      return;
    }

    handleStudentsSelected(visibleStudents.map(toStudentListItem), "add");
  }

  async function handleQuickAdjustment(
    student: StudentBalanceCardStudent,
    direction: AdjustmentDirection,
  ) {
    if (quickActionPendingRef.current) {
      return;
    }

    const preset =
      direction === "add"
        ? personalPresets.quickAdd
        : personalPresets.quickRemove;

    quickActionPendingRef.current = true;
    setQuickActionStudentId(student.id);
    setError(null);
    setMessage(null);

    try {
      const result = await createLedgerAdjustment({
        amount: direction === "add" ? preset.amount : -preset.amount,
        reason: preset.reason,
        studentUserId: student.id,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const successMessage =
        result.message ??
        `${direction === "add" ? "Added" : "Removed"} ${preset.amount} ${currencyName} ${direction === "add" ? "to" : "from"} ${student.displayName} for ${preset.reason}.`;

      setMessage(successMessage);

      try {
        await refreshStudentData();
      } catch {
        setMessage(`${successMessage} Refresh the page if balances look stale.`);
      }
    } catch {
      setError("Could not create quick transaction.");
    } finally {
      quickActionPendingRef.current = false;
      setQuickActionStudentId(null);
    }
  }

  function toggleStudentDisplayScope() {
    setSelectedGroupView(null);
    setStudentDisplayScope((currentScope) =>
      currentScope === "current-class" ? "all-students" : "current-class",
    );
    setStudentPage(1);
  }

  async function handleGroupExpanded(group: GroupListItem) {
    setError(null);

    try {
      const members = await listGroupMembers(group.id);
      setSearch("");
      setSelectedGroupView({
        memberIds: new Set(members.map((member) => member.id)),
        name: group.name,
      });
      setStudentPage(1);
    } catch {
      setError(`Could not load students in ${group.name}.`);
    }
  }

  function handleSearchChanged(value: string) {
    setSelectedGroupView(null);
    setSearch(value);
    setStudentPage(1);
  }

  async function refreshStudentData() {
    const [loadedCurrentClass, loadedBalances] = await Promise.all([
      getCurrentTeacherClass(),
      listStudentBalances(),
    ]);

    setCurrentClass(loadedCurrentClass);
    setStudentBalances(loadedBalances.filter((student) => student.isActive));
  }

  async function handleAdjustmentCreated(messageText: string) {
    setMessage(messageText);

    try {
      await refreshStudentData();
      setError(null);
    } catch {
      setError(null);
      setMessage(`${messageText} Refresh the page if balances look stale.`);
    } finally {
      setSelection(null);
    }
  }

  return (
    <>
      <FixedNotification error={error} message={message} />
    <section className="motion-panel mt-2">
        {isLoading && (
          <p className="mt-4 text-sm text-text-muted">Loading students...</p>
        )}

        {!isLoading && error && (
          <LoadFailure
            description="Student balances or the current class could not be retrieved."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not load the teacher dashboard"
          />
        )}

        {!isLoading && !error && (
          <div>
            <ShopRequestsPanel
              className="mb-4"
              compact
              currencyName={currencyName}
              helpText="Students add rewards to their cart first. Their balance and reward stock are reserved until you approve or deny the request."
              maxVisibleRequests={4}
              showViewToggle={false}
              title="Reward Requests"
            />

            <div className="teacher-mobile-controls theme-panel mb-4 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
                <SearchInput
                  aria-label="Search students or groups"
                  className="col-span-2 min-w-0 sm:flex-1"
                  id="teacherDashboardSearch"
                  onChange={handleSearchChanged}
                  placeholder="Search students or groups, or separate multiple searches with a semicolon"
                  value={search}
                />
                <button
                  className="inline-flex h-[46px] min-w-0 shrink-0 items-center justify-center rounded-md border border-button-border px-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft sm:px-4"
                  onClick={toggleStudentDisplayScope}
                  type="button"
                >
                  {studentDisplayScope === "current-class"
                    ? "Show all students"
                    : "Show current class"}
                </button>
                <div className="flex min-w-0 shrink-0 items-center gap-2">
                  <button
                    className="inline-flex h-[46px] min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-brand bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-button-border disabled:bg-panel-soft disabled:text-text-muted disabled:shadow-none sm:px-4"
                    disabled={visibleStudents.length === 0}
                    onClick={handleIssueAllShown}
                    type="button"
                  >
                    <PlusIcon />
                    <span>Issue all</span>
                  </button>
                  <InfoTooltip label="Opens one credit workflow for every student currently shown. Review the student count before submitting." />
                </div>
              </div>

              {isDefaultingToCurrentClass && !currentClass && (
                <p className="mt-3 text-sm text-text-muted">
                  No class is timetabled right now. Search for students or groups.
                </p>
              )}

              {(visibleStudents.length > 0 || visibleGroups.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CountChip
                    icon={<UsersIcon />}
                    label={`${visibleStudents.length} student${visibleStudents.length === 1 ? "" : "s"}`}
                  />
                  {visibleGroups.length > 0 && (
                    <CountChip
                      icon={<SparkleIcon />}
                      label={`${visibleGroups.length} group${visibleGroups.length === 1 ? "" : "s"}`}
                    />
                  )}
                </div>
              )}

              {selectedGroupView && (
                <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                  <span>
                    Showing <strong className="font-semibold text-foreground">{selectedGroupView.name}</strong>
                  </span>
                  <button
                    aria-label={`Clear ${selectedGroupView.name} group filter`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition hover:bg-panel-soft hover:text-foreground"
                    onClick={() => setSelectedGroupView(null)}
                    title="Clear group filter"
                    type="button"
                  >
                    <XIcon />
                  </button>
                </div>
              )}
            </div>

            {visibleStudents.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleStudentPage.map((student) => (
                    <StudentBalanceCard
                      currencyName={currencyName}
                      isQuickActionPending={quickActionStudentId === student.id}
                      key={student.id}
                      onAdjust={() =>
                        handleStudentsSelected([toStudentListItem(student)], "add")
                      }
                      onQuickAdd={() => handleQuickAdjustment(student, "add")}
                      onQuickRemove={() =>
                        handleQuickAdjustment(student, "remove")
                      }
                      quickAddAmount={personalPresets.quickAdd.amount}
                      quickRemoveAmount={personalPresets.quickRemove.amount}
                      student={student}
                    />
                  ))}
                </div>
                <ListPagination
                  onPageChange={setStudentPage}
                  page={studentPage}
                  totalCount={visibleStudents.length}
                  totalPages={studentTotalPages}
                />
              </>
            )}

            {visibleGroups.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleGroups.map((group) => (
                  <GroupCreditCard
                    group={group}
                    key={group.id}
                    onAdd={() => handleGroupSelected(group, "add")}
                    onExpand={() => handleGroupExpanded(group)}
                    onRemove={() => handleGroupSelected(group, "remove")}
                  />
                ))}
              </div>
            )}

            {visibleStudents.length === 0 &&
              visibleGroups.length === 0 &&
              !isDefaultingToCurrentClass && (
                <p className="text-sm text-text-muted">
                  {selectedGroupView
                    ? `No active students are assigned to ${selectedGroupView.name}.`
                    : "No matching students or groups."}
                </p>
              )}
          </div>
        )}
      </section>

      {selection && (
        <QuickAdjustmentModal
          currencyName={currencyName}
          onCreated={handleAdjustmentCreated}
          onClose={() => setSelection(null)}
          selection={selection}
        />
      )}
    </>
  );
}

function CountChip({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-xs font-semibold text-text-muted">
      {icon}
      {label}
    </span>
  );
}

function GroupCreditCard({
  group,
  onAdd,
  onExpand,
  onRemove,
}: {
  group: GroupListItem;
  onAdd: () => void;
  onExpand: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="theme-card p-3">
      <button
        aria-label={`Show students in ${group.name}`}
        className="flex w-full items-center gap-3 text-left"
        onClick={onExpand}
        type="button"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel-soft text-text-muted">
          <UsersIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {group.name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
            {group.memberCount} students
          </p>
        </div>
      </button>
      <div className="mt-3 flex justify-end">
        <CreditActionControl
          addAriaLabel={`Add credits to ${group.name}`}
          onAdd={onAdd}
          onRemove={onRemove}
          removeAriaLabel={`Remove credits from ${group.name}`}
        />
      </div>
    </article>
  );
}

function QuickAdjustmentModal({
  currencyName,
  onCreated,
  onClose,
  selection,
}: {
  currencyName: string;
  onCreated: (message: string) => Promise<void> | void;
  onClose: () => void;
  selection: AdjustmentTargetSelection;
}) {
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogFocus({ onEscape: onClose });

  const targetName =
    selection.kind === "group"
      ? selection.group.name
      : `${selection.students.length} student${
          selection.students.length === 1 ? "" : "s"
        }`;

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-label={`${selection.direction === "add" ? "Add" : "Take"} ${currencyName}`}
        aria-modal="true"
        className="app-modal theme-panel motion-pop max-h-[90vh] w-full max-w-xl overflow-y-auto p-5 shadow-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">
              {selection.direction === "add" ? "Add" : "Take"} {currencyName}
            </h3>
            <p className="mt-1 truncate text-sm text-text-muted">
              {targetName}
            </p>
          </div>
          <button
            aria-label="Close credit adjustment"
            className="rounded-md border border-button-border p-2 text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            <XIcon />
          </button>
        </div>

        <div className="app-modal-body">
          <LedgerAdjustmentForm
            currencyName={currencyName}
            onCreated={onCreated}
            onError={setError}
            preferredDirection={selection.direction}
            preferredGroup={
              selection.kind === "group" ? selection.group : undefined
            }
            preferredGroupId={
              selection.kind === "group" ? selection.group.id : undefined
            }
            preferredGroupSelectionVersion={selection.version}
            preferredStudents={
              selection.kind === "students" ? selection.students : undefined
            }
            preferredStudentSelectionVersion={selection.version}
          />

          {error && (
            <p
              className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getVisibleStudents(
  search: string,
  currentClass: CurrentClass | null,
  studentBalances: StudentBalanceItem[],
  studentDisplayScope: StudentDisplayScope,
  selectedGroupView: SelectedGroupView | null,
) {
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    if (selectedGroupView) {
      return studentBalances.filter((student) =>
        selectedGroupView.memberIds.has(student.id),
      );
    }

    return studentDisplayScope === "all-students"
      ? studentBalances
      : currentClass?.students ?? [];
  }

  const terms = splitSearchTerms(trimmedSearch);

  if (terms.length > 1) {
    return getStudentsMatchingAnyTerm(studentBalances, terms);
  }

  return getStudentsMatchingTerm(studentBalances, terms[0] ?? "");
}

function getVisibleGroups(search: string, groups: GroupListItem[]) {
  const trimmedSearch = search.trim();

  if (!trimmedSearch || hasSemicolonSearch(trimmedSearch)) {
    return [];
  }

  const query = normaliseSearchValue(trimmedSearch);

  return groups
    .filter((group) => normaliseSearchValue(group.name).includes(query))
    .slice(0, 8);
}

function getStudentsMatchingAnyTerm(
  students: StudentBalanceItem[],
  terms: string[],
) {
  const matchedStudents = new Map<string, StudentBalanceItem>();

  for (const term of terms) {
    for (const student of getStudentsMatchingTerm(students, term)) {
      matchedStudents.set(student.id, student);
    }
  }

  return Array.from(matchedStudents.values());
}

function getStudentsMatchingTerm(
  students: StudentBalanceItem[],
  term: string,
) {
  const query = normaliseSearchValue(term);

  if (!query) {
    return [];
  }

  return students
    .filter((student) =>
      [
        student.displayName,
        student.firstName,
        student.lastName,
        student.username,
        student.email,
      ].some((value) => normaliseSearchValue(value).includes(query)),
    )
    .slice(0, 12);
}

function splitSearchTerms(search: string) {
  return search
    .split(";")
    .map((term) => term.trim())
    .filter(Boolean);
}

function hasSemicolonSearch(search: string) {
  return search.includes(";");
}

function normaliseSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function toStudentListItem(
  student: CurrentClass["students"][number] | StudentBalanceItem,
): StudentListItem {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    displayName: student.displayName,
    profileImageUrl: student.profileImageUrl,
    username: student.username,
  };
}
