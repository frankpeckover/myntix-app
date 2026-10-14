"use client";

import { useMemo } from "react";
import { SparkleIcon, TrophyIcon } from "@/components/ui/icons";
import {
  ActivityHeatmap,
  type ActivityHeatmapDetail,
} from "@/components/ui/activity-heatmap";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PanelTitle } from "@/components/ui/panel-title";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { formatAmount, formatDateKey, formatSignedAmount } from "@/lib/presentation/formatters";
import { getActivityYearRange } from "@/lib/presentation/activity-calendar";

type StudentActivityRecapProps = {
  className?: string;
  currencyName: string;
  isLoading: boolean;
  onBrowseRewards: () => void;
  onSelectDate: (date: string) => void;
  transactions: TransactionLogItem[];
};

type ActivityDay = {
  date: Date;
  earned: number;
  net: number;
  outgoing: number;
  transactionCount: number;
};

export function StudentActivityRecap({
  className = "",
  currencyName,
  isLoading,
  onBrowseRewards,
  onSelectDate,
  transactions,
}: StudentActivityRecapProps) {
  const days = useMemo(
    () => buildActivityCalendar(transactions),
    [transactions],
  );
  const totalNet = days.reduce((total, day) => total + day.net, 0);
  const hasActivity = days.some((day) => day.transactionCount > 0);

  return (
    <section
      className={`student-dashboard-card student-activity-recap flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface px-4 py-4 sm:px-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-brand">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <PanelTitle title="Daily movement" />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Past 12 months · Mon-Fri
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && hasActivity && (
            <p
              className={`font-number text-xl font-semibold leading-none ${
                totalNet > 0
                  ? "text-positive-ink"
                  : totalNet < 0
                    ? "text-negative-ink"
                    : "text-text-control"
              }`}
              title={`Past-year net movement: ${formatSignedAmount(totalNet)} ${currencyName}`}
            >
              {formatSignedAmount(totalNet)}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="mt-3 min-h-40 px-0" lines={3} />
      ) : !hasActivity ? (
        <div className="mt-4 flex min-h-32 flex-col justify-between gap-4 rounded-xl bg-panel-soft px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-control">
              Your activity calendar is ready
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Credits earned or spent in this period will show here.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-surface px-3 text-sm font-semibold text-text-control transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={onBrowseRewards}
            type="button"
          >
            <TrophyIcon className="h-4 w-4" />
            Explore rewards
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <ActivityHeatmap
            ariaLabel="Daily movement over the past year, weekdays only"
            days={days.map((day) => ({
              amount: day.earned + day.outgoing,
              date: day.date,
              details: getActivityDayDetails(day, currencyName),
              net: day.net,
              label: formatActivityDayLabel(day.date),
            }))}
            onSelectDate={onSelectDate}
            size="large"
            weekdaysOnly
          />
        </div>
      )}
    </section>
  );
}

function buildActivityCalendar(transactions: TransactionLogItem[]) {
  const { endDateExclusive, startDate } = getActivityYearRange();
  const days: ActivityDay[] = [];
  const date = new Date(startDate);
  while (date < endDateExclusive) {
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      days.push({
        date: new Date(date),
        earned: 0,
        net: 0,
        outgoing: 0,
        transactionCount: 0,
      });
    }
    date.setDate(date.getDate() + 1);
  }
  const dayByKey = new Map(days.map((day) => [formatDateKey(day.date), day]));

  for (const transaction of transactions) {
    if (
      transaction.isVoided ||
      transaction.entryStatus !== "posted"
    ) {
      continue;
    }

    const createdAt = new Date(transaction.createdAt);
    const day = dayByKey.get(formatDateKey(createdAt));
    if (!day) continue;

    if (transaction.amount > 0) day.earned += transaction.amount;
    if (transaction.amount < 0) day.outgoing += Math.abs(transaction.amount);
    day.net += transaction.amount;
    day.transactionCount += 1;
  }

  return days;
}

function formatActivityDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);
}

function getActivityDayDetails(
  day: ActivityDay,
  currencyName: string,
): ActivityHeatmapDetail[] {
  if (day.transactionCount === 0) {
    return [{ label: "Activity", value: "No transactions" }];
  }

  const netTone = day.net > 0 ? "positive" : day.net < 0 ? "negative" : "default";
  return [
    {
      label: "Earned",
      tone: "positive" as const,
      value: `+${formatAmount(day.earned)} ${currencyName}`,
    },
    {
      label: "Spent",
      tone: "negative" as const,
      value: `-${formatAmount(day.outgoing)} ${currencyName}`,
    },
    {
      label: "Net",
      tone: netTone,
      value: `${day.net > 0 ? "+" : ""}${formatAmount(day.net)} ${currencyName}`,
    },
  ];
}
