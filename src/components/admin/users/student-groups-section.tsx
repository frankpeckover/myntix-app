import type { UserGroupItem } from "@/domains/groups/group-service";

type StudentGroupsSectionProps = {
  groups: UserGroupItem[];
  isLoading: boolean;
};

export function StudentGroupsSection({
  groups,
  isLoading,
}: StudentGroupsSectionProps) {
  return (
    <div className="theme-subpanel p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-text-control">Groups</h4>
        {isLoading && (
          <span className="text-xs font-semibold text-text-muted">
            Loading...
          </span>
        )}
      </div>

      {!isLoading && groups.length === 0 && (
        <p className="mt-2 text-sm text-text-muted">
          This student is not in any groups.
        </p>
      )}

      {!isLoading && groups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {groups.map((group) => (
            <span
              className={`rounded-sm px-2 py-1 text-xs font-semibold ${
                group.isActive
                  ? "bg-chip-bg text-chip-text"
                  : "bg-danger-soft text-danger-strong"
              }`}
              key={group.id}
              title={group.description || group.name}
            >
              {group.name}
              {!group.isActive && " (archived)"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
