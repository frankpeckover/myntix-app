import type {
  GroupListItem,
  GroupMemberItem,
} from "@/domains/groups/group-service";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

type GroupDetailsPanelProps = {
  isLoadingMembers: boolean;
  members: GroupMemberItem[];
  onClose: () => void;
  selectedGroup: GroupListItem | null;
};

export function GroupDetailsPanel({
  isLoadingMembers,
  members,
  onClose,
  selectedGroup,
}: GroupDetailsPanelProps) {
  if (!selectedGroup) {
    return null;
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="app-modal theme-panel motion-pop max-h-full w-full max-w-4xl overflow-y-auto p-5 shadow-lg">
        <div className="app-modal-header flex items-start justify-between gap-4">
          <GroupSummary memberCount={members.length} selectedGroup={selectedGroup} />
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="app-modal-body">
          <GroupMembersList isLoading={isLoadingMembers} members={members} />
        </div>
      </div>
    </div>
  );
}

function GroupSummary({
  memberCount,
  selectedGroup,
}: {
  memberCount: number;
  selectedGroup: GroupListItem;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-semibold">{selectedGroup.name}</h3>
        {!selectedGroup.isActive && (
          <span className="rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
            Archived
          </span>
        )}
      </div>
      {selectedGroup.description && (
        <p className="mt-1 text-sm text-text-muted">
          {selectedGroup.description}
        </p>
      )}
      <p className="mt-3 inline-flex rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm font-semibold text-text-control">
        {memberCount} members
      </p>
    </div>
  );
}

function GroupMembersList({
  isLoading,
  members,
}: {
  isLoading: boolean;
  members: GroupMemberItem[];
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
              <article
                className="theme-card p-3"
                key={member.id}
              >
                <p className="truncate font-semibold">{member.displayName}</p>
                <p className="truncate text-sm text-text-muted">
                  {member.username}
                </p>
              </article>
            ))}
          </div>

          <table aria-label="Group members" className="hidden w-full text-left text-sm md:table">
            <thead className="text-text-muted">
              <tr className="border-b border-border-subtle">
                <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                <th scope="col" className="py-2 font-semibold">Username</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr className="border-b border-border-subtle" key={member.id}>
                  <td className="py-2 pr-4 font-semibold">
                    {member.displayName}
                  </td>
                  <td className="py-2 text-text-muted">{member.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
