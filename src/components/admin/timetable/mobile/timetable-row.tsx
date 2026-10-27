import type { ComponentProps } from "react";
import { TimetableActions } from "@/components/admin/timetable/shared/row-actions";
import { weekDays } from "@/components/admin/timetable/timetable-constants";
import { MobileListRow } from "@/components/ui/mobile-list-row";

type MobileTimetableRowProps = ComponentProps<typeof TimetableActions> & {
  selected: boolean;
  onEntrySelectionChange: (entryId: string, selected: boolean) => void;
};

export function MobileTimetableRow({ selected, onEntrySelectionChange, ...actions }: MobileTimetableRowProps) {
  const { entry } = actions;
  const day = weekDays[entry.dayOfWeek];
  const cycleLabel = entry.cycleWeek === null ? "" : `Week ${String.fromCharCode(64 + entry.cycleWeek)}`;
  return (
    <MobileListRow selected={selected}
      selectionLabel={`Select ${entry.groupName}, ${day}, ${entry.startTime}`}
      onSelectionChange={(checked) => onEntrySelectionChange(entry.id, checked)}
      value={<span className="block text-xs text-text-muted">
        <span className="block" title={`${day}${cycleLabel ? `, ${cycleLabel}` : ""}`}>{day.slice(0, 3)}{cycleLabel ? ` · ${cycleLabel}` : ""}</span>
        <span className="mt-1 block whitespace-nowrap font-number">{entry.startTime.slice(0, 5)}–{entry.endTime.slice(0, 5)}</span>
      </span>}
      actions={<TimetableActions {...actions} mobile />}>
      <h2 className="line-clamp-2 text-sm font-semibold text-text-control" title={entry.groupName}>{entry.groupName}</h2>
      <p className="mt-1 line-clamp-2 text-xs text-text-muted">{entry.teacherName}</p>
      {!entry.isActive && <p className="mt-1 text-xs text-danger-strong">Archived</p>}
    </MobileListRow>
  );
}
