import type { CurrentClassStudent } from "@/domains/timetable/timetable-service";
import type { GroupListItem } from "@/domains/groups/group-service";
import type { AdjustmentDirection } from "@/components/transactions/ledger-adjustment-types";
import { CreditActionControl } from "@/components/ui/credit-action-control";
import { formatAmount } from "@/lib/presentation/formatters";

export function MobileCreditAccounts({
  ambiguousStudentNames,
  currencyName, groups, students, quickAddAmount, quickRemoveAmount,
  busyStudentId, busyGroupId, onStudentAdjustment, onGroupAdjustment,
  onAdjustStudent, onAdjustGroup, onOpenGroup,
}: {
  ambiguousStudentNames: Set<string>;
  currencyName: string;
  groups: GroupListItem[];
  students: CurrentClassStudent[];
  quickAddAmount: number;
  quickRemoveAmount: number;
  busyStudentId: string | null;
  busyGroupId: string | null;
  onStudentAdjustment: (student: CurrentClassStudent, direction: AdjustmentDirection) => void;
  onGroupAdjustment: (group: GroupListItem, direction: AdjustmentDirection) => void;
  onAdjustStudent: (student: CurrentClassStudent) => void;
  onAdjustGroup: (group: GroupListItem) => void;
  onOpenGroup: (group: GroupListItem) => void;
}) {
  return (
    <div className="space-y-2" data-credit-layout="mobile">
      {groups.map((group) => (
        <article key={group.id} className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <button className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-panel-soft"
            aria-label={`Show students in ${group.name}`} onClick={() => onOpenGroup(group)} type="button">
            <span className="min-w-0 break-words text-sm font-semibold text-text-control">{group.name}</span>
            <span className="shrink-0 text-xs text-text-muted">{group.memberCount} students</span>
          </button>
          <CreditActionControl fullWidth flush touchTarget
            addAriaLabel={`Quick add ${quickAddAmount} credits to ${group.name}`}
            removeAriaLabel={`Quick take ${quickRemoveAmount} credits from ${group.name}`}
            adjustAriaLabel={`Adjust credits for ${group.name}`}
            onAdd={busyGroupId === group.id ? undefined : () => onGroupAdjustment(group, "add")}
            onRemove={busyGroupId === group.id ? undefined : () => onGroupAdjustment(group, "remove")}
            onAdjust={() => onAdjustGroup(group)} />
        </article>
      ))}
      {students.map((student) => (
        <article key={student.id} className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <h2 className="break-words text-sm font-semibold text-text-control">{student.displayName}</h2>
              {ambiguousStudentNames.has(student.displayName) && (
                <p className="mt-0.5 break-words text-xs text-text-muted">@{student.username}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-number text-lg font-semibold text-text-control">{formatAmount(student.balance)}</p>
              <p className="max-w-28 break-words text-xs text-text-muted">{currencyName}</p>
            </div>
          </div>
          <CreditActionControl fullWidth flush touchTarget
            addAriaLabel={`Quick add ${quickAddAmount} credits to ${student.displayName}`}
            removeAriaLabel={`Quick take ${quickRemoveAmount} credits from ${student.displayName}`}
            adjustAriaLabel={`Adjust credits for ${student.displayName}`}
            onAdd={busyStudentId === student.id ? undefined : () => onStudentAdjustment(student, "add")}
            onRemove={busyStudentId === student.id ? undefined : () => onStudentAdjustment(student, "remove")}
            onAdjust={() => onAdjustStudent(student)} />
        </article>
      ))}
    </div>
  );
}
