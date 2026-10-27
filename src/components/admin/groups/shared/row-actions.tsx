import type { GroupListItem } from "@/domains/groups/group-service";
import { CheckIcon, CopyIcon, EyeIcon, PencilIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { RowActionControls } from "@/components/ui/row-action-controls";

export function GroupActions({
  group,
  onDuplicateGroup,
  onEditGroup,
  onEditMembers,
  onGroupSelect,
  onGroupStatusChange,
  mobile = false,
}: {
  mobile?: boolean;
  group: GroupListItem;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onEditMembers: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
}) {
  return (
    <RowActionControls mobile={mobile}
      label={`Open actions for ${group.name}`}
      items={[
        {
          icon: <EyeIcon />,
          label: "View",
          onSelect: () => onGroupSelect(group),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateGroup(group),
        },
        {
          icon: <PencilIcon />,
          label: "Edit Group",
          onSelect: () => onEditGroup(group),
        },
        {
          icon: <UsersIcon />,
          label: "Edit Members",
          onSelect: () => onEditMembers(group),
        },
        {
          icon: group.isActive ? <TrashIcon /> : <CheckIcon />,
          label: group.isActive ? "Archive" : "Restore",
          onSelect: () => onGroupStatusChange(group),
          tone: group.isActive ? "danger" : "success",
        },
      ]}
    />
  );
}
