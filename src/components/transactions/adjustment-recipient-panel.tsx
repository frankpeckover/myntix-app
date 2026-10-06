import type {
  AdjustmentTarget,
} from "@/components/transactions/ledger-adjustment-types";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { XIcon } from "@/components/ui/icons";
import { SearchInput } from "@/components/ui/search-input";
import type { GroupListItem } from "@/domains/groups/group-service";
import type { StudentListItem } from "@/domains/users/user-service";

type AdjustmentRecipientPanelProps = {
  groups: GroupListItem[];
  isLoadingGroups: boolean;
  isSearching: boolean;
  onGroupChange: (groupId: string) => void;
  onStudentQueryChange: (value: string) => void;
  onStudentRemove: (studentId: string) => void;
  onStudentSelect: (student: StudentListItem) => void;
  onTargetChange: (target: AdjustmentTarget) => void;
  searchMinChars: number;
  selectedGroup: GroupListItem | null;
  selectedGroupId: string;
  selectedStudents: StudentListItem[];
  studentQuery: string;
  studentResults: StudentListItem[];
  target: AdjustmentTarget;
};

export function AdjustmentRecipientPanel({
  groups,
  isLoadingGroups,
  isSearching,
  onGroupChange,
  onStudentQueryChange,
  onStudentRemove,
  onStudentSelect,
  onTargetChange,
  searchMinChars,
  selectedGroup,
  selectedGroupId,
  selectedStudents,
  studentQuery,
  studentResults,
  target,
}: AdjustmentRecipientPanelProps) {
  return (
    <section className="border-b border-border-subtle pb-5">
      <TargetToggle onChange={onTargetChange} target={target} />

      <RecipientHeading
        isLoadingGroups={isLoadingGroups}
        isSearching={isSearching}
        target={target}
      />

      {target === "student" ? (
        <StudentSelector
          isSearching={isSearching}
          onQueryChange={onStudentQueryChange}
          onStudentRemove={onStudentRemove}
          onStudentSelect={onStudentSelect}
          searchMinChars={searchMinChars}
          selectedStudents={selectedStudents}
          studentQuery={studentQuery}
          studentResults={studentResults}
        />
      ) : (
        <GroupSelector
          groups={groups}
          onChange={onGroupChange}
          selectedGroup={selectedGroup}
          selectedGroupId={selectedGroupId}
        />
      )}
    </section>
  );
}

function RecipientHeading({
  isLoadingGroups,
  isSearching,
  target,
}: {
  isLoadingGroups: boolean;
  isSearching: boolean;
  target: AdjustmentTarget;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">
          {target === "student" ? "Student" : "Group"}
        </h3>
        <InfoTooltip
          label={
            target === "student"
              ? "Choose more than one student before continuing. Each selected student receives a separate ledger entry."
              : "A group adjustment applies to every active student currently assigned to that group."
          }
        />
      </div>
      {target === "student" && isSearching && (
        <span className="text-xs font-semibold text-text-muted">
          Searching...
        </span>
      )}
      {target === "group" && isLoadingGroups && (
        <span className="text-xs font-semibold text-text-muted">
          Loading...
        </span>
      )}
    </div>
  );
}

function TargetToggle({
  onChange,
  target,
}: {
  onChange: (target: AdjustmentTarget) => void;
  target: AdjustmentTarget;
}) {
  const options: { label: string; value: AdjustmentTarget }[] = [
    { label: "Student", value: "student" },
    { label: "Group", value: "group" },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 rounded-md border border-border bg-surface p-1.5">
        {options.map((option) => (
          <button
            className={`rounded-sm px-4 py-3 text-base font-semibold transition ${
              target === option.value
                ? "bg-brand text-white"
                : "text-text-control hover:bg-surface-hover"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentSelector({
  isSearching,
  onQueryChange,
  onStudentRemove,
  onStudentSelect,
  searchMinChars,
  selectedStudents,
  studentQuery,
  studentResults,
}: {
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onStudentRemove: (studentId: string) => void;
  onStudentSelect: (student: StudentListItem) => void;
  searchMinChars: number;
  selectedStudents: StudentListItem[];
  studentQuery: string;
  studentResults: StudentListItem[];
}) {
  return (
    <>
      <SearchInput
        className="mt-3"
        onChange={onQueryChange}
        placeholder="Start typing a student name"
        value={studentQuery}
      />

      {selectedStudents.length > 0 && (
        <SelectedStudentList
          onRemove={onStudentRemove}
          students={selectedStudents}
        />
      )}

      {studentQuery.trim().length > 0 &&
        studentQuery.trim().length < searchMinChars && (
          <p className="theme-subpanel mt-3 px-3 py-2 text-sm text-text-muted">
            Type at least {searchMinChars} characters to search students.
          </p>
        )}

      {studentResults.length > 0 && (
        <StudentResultList onSelect={onStudentSelect} students={studentResults} />
      )}

      {studentResults.length === 0 &&
        studentQuery.trim().length >= searchMinChars &&
        !isSearching && (
        <p className="theme-subpanel mt-3 px-3 py-2 text-sm text-text-muted">
          No students found.
        </p>
      )}

    </>
  );
}

function GroupSelector({
  groups,
  onChange,
  selectedGroup,
  selectedGroupId,
}: {
  groups: GroupListItem[];
  onChange: (groupId: string) => void;
  selectedGroup: GroupListItem | null;
  selectedGroupId: string;
}) {
  if (groups.length === 0) {
    return (
      <p className="theme-subpanel mt-3 px-3 py-2 text-sm text-text-muted">
        No active groups are available.
      </p>
    );
  }

  return (
    <>
      <label
        className="mt-3 block text-sm font-semibold text-text-control"
        htmlFor="group"
      >
        Group
      </label>
      <select
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="group"
        onChange={(event) => onChange(event.target.value)}
        value={selectedGroupId}
      >
        <option value="">Select a group</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.memberCount} members)
          </option>
        ))}
      </select>

      {selectedGroup && (
        <div className="mt-3 rounded-md border border-success-border bg-success-soft px-3 py-2">
          <p className="text-sm font-semibold text-success">
            {selectedGroup.name}
          </p>
          <p className="text-xs text-success">
            {selectedGroup.memberCount} active members will receive this transaction.
          </p>
        </div>
      )}
    </>
  );
}

function SelectedStudentList({
  onRemove,
  students,
}: {
  onRemove: (studentId: string) => void;
  students: StudentListItem[];
}) {
  return (
    <div className="mt-3 rounded-md border border-success-border bg-success-soft px-3 py-2">
      <p className="text-sm font-semibold text-success">
        Selected students
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {students.map((student) => (
          <span
            className="inline-flex items-center gap-2 rounded-md border border-success-border bg-surface px-2 py-1 text-sm font-semibold text-success"
            key={student.id}
          >
            {student.displayName}
            <button
              aria-label={`Remove ${student.displayName}`}
              className="rounded-sm p-1 text-danger-strong transition hover:bg-danger-soft"
              onClick={() => onRemove(student.id)}
              title={`Remove ${student.displayName}`}
              type="button"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function StudentResultList({
  onSelect,
  students,
}: {
  onSelect: (student: StudentListItem) => void;
  students: StudentListItem[];
}) {
  return (
    <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border-subtle">
      {students.map((student) => (
        <button
          className="flex w-full items-center justify-between gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-panel-soft"
          key={student.id}
          onClick={() => onSelect(student)}
          type="button"
        >
          <span className="font-semibold text-text-control">
            {student.displayName}
          </span>
          <span className="text-text-muted">{student.username}</span>
        </button>
      ))}
    </div>
  );
}
