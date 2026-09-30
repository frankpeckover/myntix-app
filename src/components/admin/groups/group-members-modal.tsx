import { GroupMemberManagement } from "@/components/admin/groups/group-member-management";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/domains/groups/group-service";
import type { StudentListItem } from "@/domains/users/user-service";

type GroupMembersModalProps = {
  availableStudents: StudentListItem[];
  group: GroupListItem;
  isLoadingMembers: boolean;
  isSearchingStudents: boolean;
  members: GroupMemberItem[];
  onAddSelectedStudents: () => void;
  onClose: () => void;
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onStudentQueryChange: (value: string) => void;
  onStudentSelectionToggle: (student: StudentListItem) => void;
  selectedMemberIds: string[];
  selectedStudentIds: string[];
  selectedStudents: StudentListItem[];
  studentQuery: string;
};

export function GroupMembersModal({
  availableStudents,
  group,
  isLoadingMembers,
  isSearchingStudents,
  members,
  onAddSelectedStudents,
  onClose,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  onStudentQueryChange,
  onStudentSelectionToggle,
  selectedMemberIds,
  selectedStudentIds,
  selectedStudents,
  studentQuery,
}: GroupMembersModalProps) {
  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="app-modal theme-panel motion-pop max-h-full w-full max-w-4xl overflow-y-auto p-5 shadow-lg">
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold">Edit Members</h3>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-sm text-text-muted">{group.name}</p>
              <InfoTooltip label="Select students across multiple searches. Your selection stays here until you add the selected students or remove them from the selection." />
            </div>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="app-modal-body">
          <GroupMemberManagement
            availableStudents={availableStudents}
            isLoadingMembers={isLoadingMembers}
            isSearchingStudents={isSearchingStudents}
            members={members}
            onAddSelectedStudents={onAddSelectedStudents}
            onMemberSelectionToggle={onMemberSelectionToggle}
            onRemoveSelectedMembers={onRemoveSelectedMembers}
            onRemoveStudent={onRemoveStudent}
            onStudentQueryChange={onStudentQueryChange}
            onStudentSelectionToggle={onStudentSelectionToggle}
            selectedGroup={group}
            selectedMemberIds={selectedMemberIds}
            selectedStudentIds={selectedStudentIds}
            selectedStudents={selectedStudents}
            studentQuery={studentQuery}
          />
        </div>
      </div>
    </div>
  );
}
