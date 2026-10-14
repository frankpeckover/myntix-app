"use client";

import { useMemo } from "react";
import type { StudentActivityRange } from "@/components/student/activity-timeframes";
import { CrownIcon } from "@/components/ui/icons";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PanelTitle } from "@/components/ui/panel-title";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { formatDateKey, formatSignedAmount, formatSignedCurrencyAmount } from "@/lib/presentation/formatters";

type StudentBestDayCardProps = {
  className?: string;
  currencyName: string;
  isLoading: boolean;
  onSelectDate: (date: string) => void;
  range: StudentActivityRange;
  transactions: TransactionLogItem[];
};

const bestDayFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

export function StudentBestDayCard({
  className = "",
  currencyName,
  isLoading,
  onSelectDate,
  range,
  transactions,
}: StudentBestDayCardProps) {
  const bestDay = useMemo(() => getBestDay(transactions, range), [transactions, range]);

  return (
    <section className={`student-dashboard-card flex min-w-0 flex-col rounded-2xl bg-surface p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CrownIcon className="h-4 w-4 shrink-0 text-accent" />
          <PanelTitle title="Best day" />
        </div>
      </div>
      {isLoading ? (
        <LoadingSkeleton className="mt-3 px-0" lines={2} />
      ) : bestDay ? (
        <button
          aria-label={`${bestDayFormatter.format(bestDay.date)}, ${formatSignedCurrencyAmount(bestDay.net, currencyName)} net. View transactions for this day.`}
          className="mt-3 flex w-full min-w-0 flex-1 flex-col items-start justify-center gap-2 rounded-sm text-left transition-colors hover:bg-panel-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={() => onSelectDate(formatDateKey(bestDay.date))}
          type="button"
        >
          <span className="text-sm font-medium text-text-control">{bestDayFormatter.format(bestDay.date)}</span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-number text-2xl font-semibold text-positive-ink">{formatSignedAmount(bestDay.net)}</span>
            <span className="text-xs text-text-muted">{currencyName} net</span>
          </span>
        </button>
      ) : (
        <p className="mt-3 text-sm text-text-muted">No net gain in this period yet.</p>
      )}
    </section>
  );
}

function getBestDay(transactions: TransactionLogItem[], range: StudentActivityRange) {
  const endTime = range.end.getTime();
  const startTime = range.start.getTime();
  const days = new Map<string, { date: Date; net: number }>();

  for (const transaction of transactions) {
    if (transaction.isVoided || transaction.entryStatus === "voided") continue;
    const date = new Date(transaction.createdAt);
    const timestamp = date.getTime();
    if (!Number.isFinite(timestamp) || timestamp < startTime || timestamp > endTime) continue;
    const key = formatDateKey(date);
    const day = days.get(key);
    if (day) day.net += transaction.amount;
    else days.set(key, { date, net: transaction.amount });
  }

  let bestDay: { date: Date; net: number } | null = null;
  for (const day of days.values()) {
    if (day.net > (bestDay?.net ?? 0)) bestDay = day;
  }
  return bestDay;
}
