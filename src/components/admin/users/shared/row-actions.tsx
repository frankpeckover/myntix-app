import { memo } from "react";
import type { UserListItem } from "@/domains/users/user-service";
import { CheckIcon, CopyIcon, KeyIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { RowActionControls } from "@/components/ui/row-action-controls";

export const UserActions = memo(function UserActions({
  onDuplicate,
  onEdit,
  onPasswordReset,
  onUserActiveChange,
  user,
  mobile = false,
}: {
  mobile?: boolean;
  onDuplicate: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onPasswordReset: (user: UserListItem) => void;
  onUserActiveChange: (user: UserListItem, isActive: boolean) => void;
  user: UserListItem;
}) {
  return (
    <RowActionControls mobile={mobile}
      label={`Open actions for ${user.displayName}`}
      items={[
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicate(user),
        },
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEdit(user),
        },
        {
          icon: <KeyIcon />,
          label: "Reset Password",
          onSelect: () => onPasswordReset(user),
        },
        {
          icon: user.isActive ? <TrashIcon /> : <CheckIcon />,
          label: user.isActive ? "Archive" : "Restore",
          onSelect: () => onUserActiveChange(user, !user.isActive),
          tone: user.isActive ? "danger" : "success",
        },
      ]}
    />
  );
});
