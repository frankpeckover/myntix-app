"use client";

import { useEffect, useState } from "react";
import { getCurrentTeacherClass, listStaffShopRequests } from "@/lib/actions";
import type { CurrentClass } from "@/domains/timetable/timetable-service";
import { ClockIcon, CoinStackIcon, ShoppingCartIcon, UsersIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type TeacherHomePanelProps = {
  onNavigateToCredits: () => void;
  onNavigateToRequests: () => void;
  onNavigateToTimetable: () => void;
  onOpenCurrentClass: (groupId: string, groupName: string) => void;
};

export function TeacherHomePanel({
  onNavigateToCredits,
  onNavigateToRequests,
  onNavigateToTimetable,
  onOpenCurrentClass,
}: TeacherHomePanelProps) {
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHome() {
      const [classResult, requestsResult] = await Promise.allSettled([
        getCurrentTeacherClass(),
        listStaffShopRequests(),
      ]);

      if (!isMounted) return;

      if (classResult.status === "fulfilled") {
        setCurrentClass(classResult.value);
      }
      if (requestsResult.status === "fulfilled") {
        setPendingRequests(
          requestsResult.value.filter((request) => request.status === "pending").length,
        );
      }
      setIsLoading(false);
    }

    void loadHome();
    return () => { isMounted = false; };
  }, []);

  return (
    <section className="motion-panel mt-2 space-y-5">
      <PageHeader
        description="Your current class and the tasks that need attention."
        icon={<ClockIcon />}
        title="Today"
      />

      {isLoading ? (
        <LoadingSkeleton lines={3} variant="cards" />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <HomeAction
              description="Issue, remove or review student credits."
              icon={<CoinStackIcon />}
              label="Manage credits"
              onClick={onNavigateToCredits}
            />
            <HomeAction
              badge={pendingRequests > 0 ? String(pendingRequests) : undefined}
              description={pendingRequests === 1 ? "1 request needs a decision." : `${pendingRequests} requests need a decision.`}
              icon={<ShoppingCartIcon />}
              label="Reward requests"
              onClick={onNavigateToRequests}
            />
            <HomeAction
              description="View your week and open a scheduled class."
              icon={<ClockIcon />}
              label="Timetable"
              onClick={onNavigateToTimetable}
            />
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                <UsersIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase text-text-muted">Current class</p>
                <h2 className="mt-0.5 truncate text-lg font-semibold text-foreground">
                  {currentClass?.groupName ?? "No class right now"}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {currentClass
                    ? `${formatClassTime(currentClass.startTime)}–${formatClassTime(currentClass.endTime)} · ${currentClass.students.length} students`
                    : "Open your timetable to see what is coming next."}
                </p>
              </div>
              <button
                className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
                onClick={() => currentClass
                  ? onOpenCurrentClass(currentClass.groupId, currentClass.groupName)
                  : onNavigateToTimetable()}
                type="button"
              >
                {currentClass ? "Open class" : "View timetable"}
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function formatClassTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HomeAction({
  badge,
  description,
  icon,
  label,
  onClick,
}: {
  badge?: string;
  description: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex min-h-32 items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground">{label}</span>
          {badge && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-danger-foreground">{badge}</span>}
        </span>
        <span className="mt-2 block text-sm leading-5 text-text-muted">{description}</span>
      </span>
    </button>
  );
}
