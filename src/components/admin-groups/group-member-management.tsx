import { IconButton } from "@/components/ui/icon-button";
import { TrashIcon, XIcon } from "@/components/ui/icons";
import { SearchInput } from "@/components/ui/search-input";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/domains/groups/group-service";
import type { StudentListItem } from "@/domains/users/user-service";

type GroupMemberManagementProps = {
  availableStudents: StudentListItem[];
  isLoadingMembers: boolean;
  isSearchingStudents: boolean;
  members: GroupMemberItem[];
  onAddSelectedStudents: () => void;
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onStudentQueryChange: (value: string) => void;
  onStudentSelectionToggle: (student: StudentListItem) => void;
  selectedGroup: GroupListItem;
  selectedMemberIds: string[];
  selectedStudentIds: string[];
  selectedStudents: StudentListItem[];
  studentQuery: string;
};

export function GroupMemberManagement({
  availableStudents,
  isLoadingMembers,
  isSearchingStudents,
  members,
  onAddSelectedStudents,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  onStudentQueryChange,
  onStudentSelectionToggle,
  selectedGroup,
  selectedMemberIds,
  selectedStudentIds,
  selectedStudents,
  studentQuery,
}: GroupMemberManagementProps) {
  return (
    <div className="space-y-5">
      <GroupStudentSearch
        availableStudents={availableStudents}
        isSearching={isSearchingStudents}
        onAddSelectedStudents={onAddSelectedStudents}
        onQueryChange={onStudentQueryChange}
        onStudentSelectionToggle={onStudentSelectionToggle}
        selectedGroup={selectedGroup}
        selectedStudentIds={selectedStudentIds}
        selectedStudents={selectedStudents}
        studentQuery={studentQuery}
      />

      <GroupMembersTable
        isLoading={isLoadingMembers}
        members={members}
        onMemberSelectionToggle={onMemberSelectionToggle}
        onRemoveSelectedMembers={onRemoveSelectedMembers}
        onRemoveStudent={onRemoveStudent}
        selectedMemberIds={selectedMemberIds}
      />
    </div>
  );
}

function GroupStudentSearch({
  availableStudents,
  isSearching,
  onAddSelectedStudents,
  onQueryChange,
  onStudentSelectionToggle,
  selectedGroup,
  selectedStudentIds,
  selectedStudents,
  studentQuery,
}: {
  availableStudents: StudentListItem[];
  isSearching: boolean;
  onAddSelectedStudents: () => void;
  onQueryChange: (value: string) => void;
  onStudentSelectionToggle: (student: StudentListItem) => void;
  selectedGroup: GroupListItem;
  selectedStudentIds: string[];
  selectedStudents: StudentListItem[];
  studentQuery: string;
}) {
  return (
    <div className={selectedGroup.isActive ? "" : "opacity-60"}>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="studentSearch"
      >
        Add student
      </label>
      <SearchInput
        className="mt-2"
        disabled={!selectedGroup.isActive}
        id="studentSearch"
        onChange={onQueryChange}
        placeholder="Search by name or username"
        value={studentQuery}
      />
      {isSearching && (
        <p className="mt-2 text-sm text-text-muted">Searching...</p>
      )}
      {selectedStudents.length > 0 && (
        <SelectedStudents
          isGroupActive={selectedGroup.isActive}
          onAddSelectedStudents={onAddSelectedStudents}
          onStudentSelectionToggle={onStudentSelectionToggle}
          students={selectedStudents}
        />
      )}
      {availableStudents.length > 0 && studentQuery && (
        <StudentSearchResults
          onStudentSelectionToggle={onStudentSelectionToggle}
          selectedGroup={selectedGroup}
          selectedStudentIds={selectedStudentIds}
          students={availableStudents}
        />
      )}
    </div>
  );
}

function StudentSearchResults({
  onStudentSelectionToggle,
  selectedGroup,
  selectedStudentIds,
  students,
}: {
  onStudentSelectionToggle: (student: StudentListItem) => void;
  selectedGroup: GroupListItem;
  selectedStudentIds: string[];
  students: StudentListItem[];
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border-subtle bg-surface">
      {students.map((student) => (
        <div
          className="flex w-full items-center justify-between gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-panel-soft"
          key={student.id}
        >
          <label className="flex min-w-0 items-center gap-2">
            <input
              checked={selectedStudentIds.includes(student.id)}
              className="h-4 w-4"
              disabled={!selectedGroup.isActive}
              onChange={() => onStudentSelectionToggle(student)}
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-text-control">
                {student.displayName}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {student.username}
              </span>
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

function SelectedStudents({
  isGroupActive,
  onAddSelectedStudents,
  onStudentSelectionToggle,
  students,
}: {
  isGroupActive: boolean;
  onAddSelectedStudents: () => void;
  onStudentSelectionToggle: (student: StudentListItem) => void;
  students: StudentListItem[];
}) {
  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          Selected students ({students.length})
        </p>
        {isGroupActive && (
          <button
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            onClick={onAddSelectedStudents}
            type="button"
          >
            Add selected
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {students.map((student) => (
          <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-surface py-1 pl-2 pr-1 text-sm text-text-control"
            key={student.id}
          >
            <span className="truncate">
              {student.displayName}
              <span className="text-text-muted"> ({student.username})</span>
            </span>
            <button
              aria-label={`Remove ${student.displayName} from selection`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-muted transition hover:bg-surface-hover hover:text-text-control"
              onClick={() => onStudentSelectionToggle(student)}
              title={`Remove ${student.displayName} from selection`}
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

function GroupMembersTable({
  isLoading,
  members,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  selectedMemberIds,
}: {
  isLoading: boolean;
  members: GroupMemberItem[];
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  selectedMemberIds: string[];
}) {
  return (
    <div className="mt-5">
      {isLoading && (
        <p className="text-sm text-text-muted">Loading members...</p>
      )}
      {!isLoading && members.length === 0 && (
        <p className="text-sm text-text-muted">
          No students have been added to this group.
        </p>
      )}
      {!isLoading && members.length > 0 && (
        <>
          <div className="grid gap-2 md:hidden">
            {members.map((member) => (
              <MemberCard
                isSelected={selectedMemberIds.includes(member.id)}
                key={member.id}
                member={member}
                onRemoveStudent={onRemoveStudent}
                onSelectionToggle={onMemberSelectionToggle}
              />
            ))}
          </div>

          <table aria-label="Students available to add" className="hidden w-full table-fixed text-left text-sm md:table">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[42%]" />
              <col className="w-[38%]" />
              <col className="w-12" />
            </colgroup>
            <thead className="text-text-muted">
              <tr className="border-b border-border-subtle">
                <th scope="col" className="py-2 pr-4 font-semibold">Select</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Username</th>
                <th scope="col" className="py-2 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr className="border-b border-border-subtle" key={member.id}>
                  <td className="py-2 pr-4">
                    <input
                      checked={selectedMemberIds.includes(member.id)}
                      className="h-4 w-4"
                      onChange={() => onMemberSelectionToggle(member.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="py-2 pr-4 font-semibold">
                    {member.displayName}
                  </td>
                  <td className="py-2 pr-4 text-text-muted">
                    {member.username}
                  </td>
                  <td className="py-2 text-right">
                    <TableActionMenu
                      label={`Open actions for ${member.displayName}`}
                      items={[
                        {
                          icon: <TrashIcon />,
                          label: "Remove",
                          onSelect: () => onRemoveStudent(member),
                          tone: "danger",
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {selectedMemberIds.length > 0 && (
        <button
          className="mt-3 rounded-md border border-danger-button-border px-4 py-2 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft"
          onClick={onRemoveSelectedMembers}
          type="button"
        >
          Remove Selected ({selectedMemberIds.length})
        </button>
      )}
    </div>
  );
}

function MemberCard({
  isSelected,
  member,
  onRemoveStudent,
  onSelectionToggle,
}: {
  isSelected: boolean;
  member: GroupMemberItem;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onSelectionToggle: (memberId: string) => void;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 items-start gap-3">
          <input
            checked={isSelected}
            className="mt-1 h-4 w-4"
            onChange={() => onSelectionToggle(member.id)}
            type="checkbox"
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {member.displayName}
            </span>
            <span className="block truncate text-sm text-text-muted">
              {member.username}
            </span>
          </span>
        </label>
        <IconButton
          label={`Remove ${member.displayName}`}
          onClick={() => onRemoveStudent(member)}
          tone="danger"
        >
          <TrashIcon />
        </IconButton>
      </div>
    </article>
  );
}
