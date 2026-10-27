import type { TimetableEntry } from "@/domains/timetable/timetable-service";
import { CheckIcon, CopyIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { RowActionControls } from "@/components/ui/row-action-controls";

export function TimetableActions({
  entry,
  onDeleteEntry,
  onDuplicateEntry,
  onEditEntry,
  mobile = false,
}: {
  mobile?: boolean;
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
}) {
  return (
    <RowActionControls mobile={mobile}
      label={`Open actions for ${entry.groupName}`}
      items={[
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEditEntry(entry),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateEntry(entry),
        },
        {
          icon: entry.isActive ? <TrashIcon /> : <CheckIcon />,
          label: entry.isActive ? "Archive" : "Restore",
          onSelect: () => onDeleteEntry(entry),
          tone: entry.isActive ? "danger" : "success",
        },
      ]}
    />
  );
}
