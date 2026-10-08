"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SparkleIcon } from "@/components/ui/icons";
import { PanelTitle } from "@/components/ui/panel-title";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { formatAmount } from "@/lib/presentation/formatters";

type StudentActivityRecapProps = {
  currencyName: string;
  isLoading: boolean;
  transactions: TransactionLogItem[];
};

type WeekdayMovement = {
  day: string;
  earned: number;
  isFuture: boolean;
  net: number;
  outgoing: number;
  timestamp: number;
};

type MovementTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: { payload: WeekdayMovement }[];
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function StudentActivityRecap({
  currencyName,
  isLoading,
  transactions,
}: StudentActivityRecapProps) {
  const movement = buildWeekdayMovement(transactions, 0);
  const previousMovement = buildWeekdayMovement(transactions, -7);
  const elapsedWeekdayCount = movement.filter((day) => !day.isFuture).length;
  const weeklyNet = movement
    .slice(0, elapsedWeekdayCount)
    .reduce((total, day) => total + day.net, 0);
  const previousWeeklyNet = previousMovement
    .slice(0, elapsedWeekdayCount)
    .reduce(
      (total, day) => total + day.net,
      0,
    );
  const comparison = weeklyNet - previousWeeklyNet;

  return (
    <section className="student-dashboard-card student-activity-recap dashboard-unit-4 overflow-hidden rounded-3xl bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <PanelTitle title="Daily movement" />
          </div>
          <p className="mt-1 text-xs text-text-muted">Monday to Friday</p>
        </div>

        {!isLoading && (
          <div className="sm:text-right">
            <p
              className={`font-number text-2xl font-semibold leading-none ${
                weeklyNet > 0
                  ? "text-positive-ink"
                  : weeklyNet < 0
                    ? "text-negative-ink"
                    : "text-text-control"
              }`}
            >
              {weeklyNet > 0 ? "+" : ""}
              {formatAmount(weeklyNet)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {formatComparison(comparison, currencyName)}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton className="mt-3 min-h-40 px-0" lines={3} />
      ) : (
        <WeekdayMovementChart
          currencyName={currencyName}
          movement={movement}
        />
      )}
    </section>
  );
}

function WeekdayMovementChart({
  currencyName,
  movement,
}: {
  currencyName: string;
  movement: WeekdayMovement[];
}) {
  const maximumMovement = Math.max(
    ...movement.map((day) => Math.abs(day.net)),
    1,
  );
  const axisMaximum = getRoundedAxisMaximum(maximumMovement);
  const ticks = [-axisMaximum, 0, axisMaximum];

  return (
    <div className="mt-2 h-44 w-full sm:h-48">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={movement}
          margin={{ bottom: 0, left: 4, right: 4, top: 12 }}
        >
          <CartesianGrid horizontal={false} vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="day"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[-axisMaximum, axisMaximum]}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            tickLine={false}
            ticks={ticks}
            width={56}
          />
          {ticks.map((tick) => (
            <ReferenceLine
              key={tick}
              stroke={tick === 0 ? "var(--border-strong)" : "var(--border-subtle)"}
              strokeOpacity={tick === 0 ? 0.75 : 0.45}
              y={tick}
            />
          ))}
          <Tooltip
            content={<MovementTooltip currencyName={currencyName} />}
            cursor={{ fill: "var(--panel-soft)", opacity: 0.55 }}
          />
          <Bar dataKey="net" maxBarSize={52} radius={[6, 6, 6, 6]}>
            {movement.map((day) => (
              <Cell
                fill={
                  day.isFuture
                    ? "var(--border-muted)"
                    : day.net >= 0
                      ? "var(--positive-fill)"
                      : "var(--negative-fill)"
                }
                fillOpacity={day.isFuture ? 0.6 : 1}
                key={day.timestamp}
                stroke={
                  day.isFuture
                    ? "var(--border-muted)"
                    : day.net >= 0
                      ? "var(--positive-ink)"
                      : "var(--negative-ink)"
                }
                strokeWidth={day.isFuture ? 0 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MovementTooltip({
  active,
  currencyName,
  payload,
}: MovementTooltipProps) {
  const day = payload?.[0]?.payload;

  if (!active || !day || day.isFuture) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-text-control">{day.day}</p>
      <div className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
        <span className="text-text-muted">Earned</span>
        <span className="text-right font-medium text-positive-ink">
          +{formatAmount(day.earned)}
        </span>
        <span className="text-text-muted">Outgoing</span>
        <span className="text-right font-medium text-negative-ink">
          -{formatAmount(day.outgoing)}
        </span>
        <span className="border-t border-border-subtle pt-1 text-text-control">
          Net
        </span>
        <span className="border-t border-border-subtle pt-1 text-right font-semibold text-text-control">
          {day.net > 0 ? "+" : ""}
          {formatAmount(day.net)} {currencyName}
        </span>
      </div>
    </div>
  );
}

function buildWeekdayMovement(
  transactions: TransactionLogItem[],
  weekOffsetDays: number,
) {
  const currentWeekStart = startOfCurrentWeek();
  const weekStart = new Date(
    currentWeekStart.getTime() + weekOffsetDays * millisecondsPerDay,
  );
  const now = new Date();
  const postedTransactions = transactions.filter(
    (transaction) =>
      !transaction.isVoided && transaction.entryStatus === "posted",
  );

  return Array.from({ length: 5 }, (_, dayIndex): WeekdayMovement => {
    const dayStart = new Date(
      weekStart.getTime() + dayIndex * millisecondsPerDay,
    );
    const dayEnd = new Date(dayStart.getTime() + millisecondsPerDay);
    const dailyTransactions = postedTransactions.filter((transaction) => {
      const createdAt = new Date(transaction.createdAt);
      return createdAt >= dayStart && createdAt < dayEnd;
    });
    const earned = dailyTransactions.reduce(
      (total, transaction) =>
        transaction.amount > 0 ? total + transaction.amount : total,
      0,
    );
    const outgoing = dailyTransactions.reduce(
      (total, transaction) =>
        transaction.amount < 0
          ? total + Math.abs(transaction.amount)
          : total,
      0,
    );

    return {
      day: new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(
        dayStart,
      ),
      earned,
      isFuture: weekOffsetDays === 0 && dayStart > now,
      net: earned - outgoing,
      outgoing,
      timestamp: dayStart.getTime(),
    };
  });
}

function startOfCurrentWeek() {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRoundedAxisMaximum(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatComparison(comparison: number, currencyName: string) {
  if (comparison === 0) {
    return "Same net movement as last week";
  }

  return `${formatAmount(Math.abs(comparison))} ${currencyName} ${
    comparison > 0 ? "ahead of" : "behind"
  } last week`;
}
