import type { ComponentProps } from "react";
import { UserActions } from "@/components/admin/users/shared/row-actions";
import { MobileListRow } from "@/components/ui/mobile-list-row";

type MobileUserRowProps = ComponentProps<typeof UserActions> & {
  ambiguousName: boolean;
  selected: boolean;
  onSelectionChange: (userId: string, selected: boolean) => void;
};

export function MobileUserRow({ ambiguousName, selected, onSelectionChange, ...actions }: MobileUserRowProps) {
  const { user } = actions;
  return (
    <MobileListRow selected={selected} selectionLabel={`Select ${user.displayName}`}
      onSelectionChange={(checked) => onSelectionChange(user.id, checked)}
      value={<span className="text-xs capitalize text-text-muted">{user.role === "teacher" ? "Staff" : user.role}</span>}
      actions={<UserActions {...actions} mobile />}>
      <h2 className="line-clamp-2 text-sm font-semibold text-text-control" title={user.displayName}>{user.displayName}</h2>
      {ambiguousName && <p className="mt-1 truncate text-xs text-text-muted" title={user.username}>@{user.username}</p>}
      {!user.isActive && <p className="mt-1 text-xs text-danger-strong">Archived</p>}
    </MobileListRow>
  );
}
