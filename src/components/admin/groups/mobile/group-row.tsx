import type { ComponentProps } from "react";
import { GroupActions } from "@/components/admin/groups/shared/row-actions";
import { MobileListRow } from "@/components/ui/mobile-list-row";
import { UsersIcon } from "@/components/ui/icons";

type MobileGroupRowProps = ComponentProps<typeof GroupActions> & {
  isSelected: boolean;
  selected: boolean;
  onGroupSelectionChange: (groupId: string, selected: boolean) => void;
};

export function MobileGroupRow({ isSelected, selected, onGroupSelectionChange, ...actions }: MobileGroupRowProps) {
  const { group } = actions;
  return (
    <MobileListRow selected={selected} selectionLabel={`Select ${group.name}`}
      onSelectionChange={(checked) => onGroupSelectionChange(group.id, checked)}
      value={<span className="inline-flex items-center gap-1.5 text-sm text-text-muted" aria-label={`${group.memberCount} members`}>
        <UsersIcon className="h-4 w-4" />
        <span className="font-number">{group.memberCount}</span>
      </span>}
      actions={<GroupActions {...actions} mobile />}>
      <h2 className={`line-clamp-2 text-sm font-semibold ${isSelected ? "text-brand" : "text-text-control"}`} title={group.name}>{group.name}</h2>
      {!group.isActive && <p className="mt-1 text-xs text-danger-strong">Archived</p>}
    </MobileListRow>
  );
}
