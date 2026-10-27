import type { CurrentClass } from "@/domains/timetable/timetable-service";
import { ClockIcon, CoinStackIcon, ShoppingCartIcon } from "@/components/ui/icons";

export function MobileTeacherHome({ currentClass, classTimeLabel, pendingRequests,
  onNavigateToCredits, onNavigateToRequests, onNavigateToTimetable, onOpenCurrentClass,
}: {
  currentClass: CurrentClass | null;
  classTimeLabel: string;
  pendingRequests: number;
  onNavigateToCredits: () => void;
  onNavigateToRequests: () => void;
  onNavigateToTimetable: () => void;
  onOpenCurrentClass: (groupId: string, groupName: string) => void;
}) {
  return (
    <div className="mt-2 space-y-3" data-dashboard-layout="mobile-teacher">
      <section className="rounded-lg border border-border-subtle bg-surface p-4">
        <p className="text-xs font-medium text-text-muted">Current class</p>
        <h2 className="mt-1 break-words text-xl font-semibold text-foreground">
          {currentClass?.groupName ?? "No class right now"}
        </h2>
        {currentClass && <p className="mt-1 text-sm text-text-muted">
          {classTimeLabel} &middot; {currentClass.students.length} students
        </p>}
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-[color:var(--brand-foreground)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={() => currentClass
            ? onOpenCurrentClass(currentClass.groupId, currentClass.groupName)
            : onNavigateToCredits()}
          type="button"
        >
          <CoinStackIcon className="h-5 w-5" />
          {currentClass ? "Open class & issue credits" : "Issue credits"}
        </button>
      </section>
      {currentClass && <button
        className="min-h-11 w-full rounded-md border border-button-border bg-surface px-4 py-2 text-sm font-medium text-text-control hover:bg-panel-soft"
        onClick={onNavigateToCredits} type="button"
      >Find other students</button>}
      <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
        <button className="flex min-h-14 w-full items-center gap-3 rounded-t-lg px-4 py-3 text-left text-sm text-text-control hover:bg-panel-soft"
          onClick={onNavigateToRequests} type="button">
          <ShoppingCartIcon className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 font-medium">Reward requests</span>
          <span className="shrink-0 rounded-md bg-panel-soft px-2 py-1 font-number text-sm" aria-label={`${pendingRequests} pending requests`}>
            {pendingRequests}
          </span>
        </button>
        <button className="flex min-h-14 w-full items-center gap-3 rounded-b-lg px-4 py-3 text-left text-sm font-medium text-text-control hover:bg-panel-soft"
          onClick={onNavigateToTimetable} type="button">
          <ClockIcon className="h-5 w-5 shrink-0 text-brand" />
          My timetable
        </button>
      </div>
    </div>
  );
}
