"use client";

import type { ReactNode } from "react";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { formatAmount } from "@/lib/presentation/formatters";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ListIcon,
  SparkleIcon,
} from "@/components/ui/icons";

type StudentActivityRecapProps = {
  currencyName: string;
  isLoading: boolean;
  transactions: TransactionLogItem[];
};

export function StudentActivityRecap({
  currencyName,
  isLoading,
  transactions,
}: StudentActivityRecapProps) {
  const recap = getWeeklyRecap(transactions);

  return (
    <section className="student-dashboard-card student-activity-recap dashboard-unit-4 overflow-hidden rounded-3xl bg-surface px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
              <SparkleIcon className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-semibold text-foreground">This week</h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {isLoading ? "Loading your activity..." : getRecapMessage(recap, currencyName)}
          </p>
        </div>
        <p className="text-xs font-medium text-text-muted">Since Monday</p>
      </div>

      <div className="mt-3 grid grid-cols-2 border-t border-border-subtle sm:grid-cols-4">
        <RecapMetric
          icon={<ArrowUpIcon />}
          label="Earned"
          tone="positive"
          value={isLoading ? "-" : formatAmount(recap.earned)}
          valueSuffix={currencyName}
        />
        <RecapMetric
          icon={<ArrowDownIcon />}
          label="Outgoing"
          tone="negative"
          value={isLoading ? "-" : formatAmount(recap.outgoing)}
          valueSuffix={currencyName}
        />
        <RecapMetric
          icon={<SparkleIcon />}
          label="Net change"
          tone={recap.net > 0 ? "positive" : recap.net < 0 ? "negative" : "neutral"}
          value={isLoading ? "-" : `${recap.net > 0 ? "+" : ""}${formatAmount(recap.net)}`}
          valueSuffix={currencyName}
        />
        <RecapMetric
          icon={<ListIcon />}
          label="Account entries"
          tone="neutral"
          value={isLoading ? "-" : formatAmount(recap.entryCount)}
          valueSuffix={recap.entryCount === 1 ? "entry" : "entries"}
        />
      </div>
    </section>
  );
}

function RecapMetric({
  icon,
  label,
  tone,
  value,
  valueSuffix,
}: {
  icon: ReactNode;
  label: string;
  tone: "negative" | "neutral" | "positive";
  value: string;
  valueSuffix: string;
}) {
  const toneClassName =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger-strong"
        : "text-text-control";

  return (
    <article className="student-recap-item flex min-w-0 gap-2.5 border-b border-border-subtle py-2 even:pl-4 odd:pr-4 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel-soft ${toneClassName}`}>
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className={`font-number truncate text-xl font-semibold leading-none ${toneClassName}`}>
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] font-normal text-text-muted">
          {valueSuffix}
        </p>
        <p className="mt-1.5 truncate text-xs font-medium text-text-control">
          {label}
        </p>
      </div>
    </article>
  );
}

function getWeeklyRecap(transactions: TransactionLogItem[]) {
  const weekStart = startOfCurrentWeek().getTime();
  const activity = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt).getTime();
    return (
      Number.isFinite(createdAt) &&
      createdAt >= weekStart &&
      !transaction.isVoided &&
      transaction.entryStatus === "posted"
    );
  });
  const earned = activity.reduce(
    (total, transaction) =>
      transaction.amount > 0 ? total + transaction.amount : total,
    0,
  );
  const outgoing = activity.reduce(
    (total, transaction) =>
      transaction.amount < 0 ? total + Math.abs(transaction.amount) : total,
    0,
  );

  return {
    earned,
    entryCount: activity.length,
    net: earned - outgoing,
    outgoing,
  };
}

function startOfCurrentWeek() {
  const start = new Date();
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRecapMessage(
  recap: ReturnType<typeof getWeeklyRecap>,
  currencyName: string,
) {
  if (recap.entryCount === 0) {
    return "Your weekly activity will appear here.";
  }
  if (recap.net > 0) {
    return `You're ${formatAmount(recap.net)} ${currencyName} ahead this week.`;
  }
  if (recap.net < 0) {
    return `${formatAmount(Math.abs(recap.net))} ${currencyName} moved out this week.`;
  }

  return "Your incoming and outgoing credits are balanced this week.";
}
