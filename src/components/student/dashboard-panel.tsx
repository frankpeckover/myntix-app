"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StudentShopRequestsPanel } from "@/components/rewards/student-shop-requests-panel";
import { StudentGoalCard } from "@/components/student/goal-card";
import { StudentActivityRecap } from "@/components/student/activity-recap";
import { StudentTransactionNotificationModal } from "@/components/student/transaction-notification-modal";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { SparkleIcon, WalletIcon } from "@/components/ui/icons";
import { InlineSelectMenu } from "@/components/ui/inline-select-menu";
import { LoadFailure } from "@/components/ui/load-failure";
import {
  getStudentBalance,
  listUnseenTransactions,
  listTransactionLog,
  markTransactionsSeen,
} from "@/lib/actions";
import {
  buildBalanceTimeSeries,
  getBalanceAxisTicks,
  getTimeAxisTicks,
  type BalanceTimePoint,
} from "@/lib/presentation/chart-time-scale";
import { formatAmount, formatCurrencyAmount } from "@/lib/presentation/formatters";
import type { SessionUser } from "@/lib/auth/session";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import type { UnseenTransaction } from "@/domains/ledger/transaction-notification-service";

type StudentDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  schoolLogoUrl: string;
  schoolName: string;
};

type BalanceTrendTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: { payload: BalanceTimePoint }[];
};

type BalanceHistoryWindow = "day" | "week" | "month" | "custom";

const ACTIVE_CHART_POINT_RADIUS = 6;
const CHART_STROKE_WIDTH = 2;
const CHART_CURSOR_WIDTH = 2;
const BALANCE_COUNT_ANIMATION_DURATION_MS = 650;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const balanceHistoryWindowOptions: {
  label: string;
  value: BalanceHistoryWindow;
}[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Custom", value: "custom" },
];
const studentMetricTimeframeOptions = [
  { label: "Week", value: 7 },
  { label: "Month", value: 30 },
  { label: "3 months", value: 90 },
] as const;
type StudentMetricTimeframeDays =
  (typeof studentMetricTimeframeOptions)[number]["value"];

export function StudentDashboardPanel({
  currencyName,
  currentUser,
  schoolLogoUrl,
  schoolName,
}: StudentDashboardPanelProps) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [unseenTransactions, setUnseenTransactions] = useState<
    UnseenTransaction[]
  >([]);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [isDismissingNotifications, setIsDismissingNotifications] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      try {
        const currentBalance = await getStudentBalance();

        if (isMounted) {
          setBalance(currentBalance);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load balance.");
        }
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadUnseenTransactions() {
      try {
        const loadedTransactions = await listUnseenTransactions();

        if (isMounted) {
          setUnseenTransactions(loadedTransactions);
        }
      } catch {
        if (isMounted) {
          setUnseenTransactions([]);
        }
      }
    }

    loadUnseenTransactions();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  async function dismissTransactionNotifications() {
    if (isDismissingNotifications || unseenTransactions.length === 0) {
      return;
    }

    setIsDismissingNotifications(true);
    setNotificationError(null);

    try {
      const result = await markTransactionsSeen(
        unseenTransactions.map((transaction) => transaction.id),
      );

      if (!result.ok) {
        setNotificationError(result.message);
        return;
      }

      setUnseenTransactions([]);
    } catch {
      setNotificationError("Could not dismiss these updates. Please try again.");
    } finally {
      setIsDismissingNotifications(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      setIsTransactionsLoading(true);

      try {
        const loadedTransactions = await listTransactionLog();

        if (isMounted) {
          setTransactions(loadedTransactions);
          setTransactionsError(null);
        }
      } catch {
        if (isMounted) {
          setTransactionsError("Could not load activity history.");
        }
      } finally {
        if (isMounted) {
          setIsTransactionsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  return (
    <>
      <FixedNotification error={error ?? transactionsError} />
      {(error || transactionsError) && (
        <div className="mt-2">
          <LoadFailure
            description="Some dashboard data is temporarily unavailable. Existing records have not been changed."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not refresh your dashboard"
          />
        </div>
      )}
      <section className="student-dashboard-section dashboard-grid motion-panel mt-2">
        <StudentWalletCard
          balance={balance}
          celebrate={unseenTransactions.some((transaction) => transaction.amount > 0)}
          currencyName={currencyName}
          currentUser={currentUser}
          schoolLogoUrl={schoolLogoUrl}
          schoolName={schoolName}
        />
        <BalanceTrendCard
          currencyName={currencyName}
          isLoading={isTransactionsLoading && !transactionsError}
          transactions={transactions}
        />
        <StudentGoalCard
          balance={balance}
          className="dashboard-unit-1"
          currencyName={currencyName}
        />
      </section>

      <section className="student-dashboard-section dashboard-grid mt-5">
        <StudentActivityRecap
          currencyName={currencyName}
          isLoading={isTransactionsLoading && !transactionsError}
          transactions={transactions}
        />
      </section>

      <section className="student-dashboard-section dashboard-grid mt-5">
        <StudentShopRequestsPanel
          className="dashboard-unit-3"
          currencyName={currencyName}
        />
        <StudentMetricStrip
          className="student-dashboard-card student-metric-strip dashboard-unit-1"
          currencyName={currencyName}
          transactions={transactions}
        />
      </section>

      <TransactionLogPanel
        className="student-dashboard-card student-dashboard-transaction-log"
        currencyName={currencyName}
        currentUser={currentUser}
      />

      {unseenTransactions.length > 0 && (
        <StudentTransactionNotificationModal
          currencyName={currencyName}
          error={notificationError}
          isDismissing={isDismissingNotifications}
          onDismiss={dismissTransactionNotifications}
          transactions={unseenTransactions}
        />
      )}
    </>
  );
}

function StudentWalletCard({
  balance,
  celebrate,
  currencyName,
  currentUser,
  schoolLogoUrl,
  schoolName,
}: {
  balance: number;
  celebrate: boolean;
  currencyName: string;
  currentUser: SessionUser;
  schoolLogoUrl: string;
  schoolName: string;
}) {
  const balanceAmount = useAnimatedWholeNumber(Math.abs(balance));
  const [cardDate, setCardDate] = useState("");

  useEffect(() => {
    window.queueMicrotask(() => {
      setCardDate(formatWalletDate(new Date()));
    });
  }, []);

  return (
    <article className={`student-dashboard-card student-wallet-card dashboard-unit-2 wallet-card rounded-2xl ${celebrate ? "student-wallet-celebrate" : ""}`}>
      <div className="relative flex h-full min-h-52 flex-col">
        <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--student-card-muted)]">
                My Credits
              </p>
              {celebrate && (
                <span className="wallet-credit-spark text-[color:var(--student-card-accent)]">
                  <SparkleIcon className="h-4 w-4" />
                </span>
              )}
            </div>
            <p className="max-w-56 truncate text-right text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--student-card-muted)]">
              {schoolName}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-[minmax(0,1.35fr)_minmax(7rem,0.65fr)] items-center gap-4 py-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 break-words text-[color:var(--student-card-text)]">
                <span className="wallet-balance-number text-6xl leading-none sm:text-7xl">
                  {formatAmount(balanceAmount)}
                </span>
                <span className="text-base font-medium text-[color:var(--student-card-accent)] sm:text-lg">
                  {currencyName}
                </span>
              </p>
            </div>
            <p
              aria-label={cardDate ? `Today's date ${cardDate}` : undefined}
              className="min-h-5 text-right font-number text-lg font-medium tracking-[0.18em] text-[color:var(--student-card-muted)] sm:text-xl"
            >
              {cardDate}
            </p>
          </div>

          <div className="flex min-h-8 items-end justify-between gap-4">
            <h2 className="min-w-0 truncate text-sm font-medium uppercase tracking-[0.1em] text-[color:var(--student-card-text)] sm:text-base">
              {currentUser.displayName}
            </h2>
            {schoolLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Organisation logos are uploaded at runtime.
              <img
                alt={`${schoolName} logo`}
                className="h-8 max-w-16 shrink-0 object-contain object-right opacity-85"
                src={schoolLogoUrl}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatWalletDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}${month} ${date.getFullYear()}`;
}

function BalanceTrendCard({
  currencyName,
  isLoading,
  transactions,
}: {
  currencyName: string;
  isLoading: boolean;
  transactions: TransactionLogItem[];
}) {
  const [selectedWindow, setSelectedWindow] =
    useState<BalanceHistoryWindow>("month");
  const [customStartDate, setCustomStartDate] = useState(() =>
    formatDateInput(addDays(new Date(), -29)),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const chartPoints = buildBalanceChartPoints(transactions, selectedWindow, {
    endDate: customEndDate,
    startDate: customStartDate,
  });
  const balanceTicks = getBalanceAxisTicks(chartPoints);
  const timeTicks = getTimeAxisTicks(chartPoints);

  return (
    <article className="student-dashboard-card student-balance-trend-card dashboard-unit-1 flex min-h-52 rounded-3xl border border-transparent bg-surface p-4 sm:p-5">
      <div className="flex min-h-56 w-full flex-col rounded-2xl bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <WalletIcon className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-foreground">Balance</h2>
          </div>
          <ChartScaleMenu
            onWindowChange={setSelectedWindow}
            selectedWindow={selectedWindow}
          />
        </div>
        {selectedWindow === "custom" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-text-muted">
              Start
              <input
                className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-control outline-none ring-brand focus:ring-2"
                max={customEndDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                type="date"
                value={customStartDate}
              />
            </label>
            <label className="text-xs font-medium text-text-muted">
              End
              <input
                className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-control outline-none ring-brand focus:ring-2"
                max={formatDateInput(new Date())}
                min={customStartDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                type="date"
                value={customEndDate}
              />
            </label>
          </div>
        )}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-text-muted">Loading trend...</p>
          </div>
        )}
        {!isLoading && chartPoints.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-sm text-text-muted">
              No balance history yet.
            </p>
          </div>
        )}
        {!isLoading && chartPoints.length > 0 && (
          <div className="mt-2 h-56 w-full flex-1">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={chartPoints}
                margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
              >
                <defs>
                  <linearGradient id="studentBalanceFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeOpacity={0.45}
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="timestamp"
                  domain={["dataMin", "dataMax"]}
                  minTickGap={12}
                  tickFormatter={(timestamp) =>
                    findChartPointLabel(chartPoints, Number(timestamp))
                  }
                  ticks={timeTicks}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  domain={[0, balanceTicks[balanceTicks.length - 1]]}
                  ticks={balanceTicks}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickLine={false}
                  type="number"
                  width={40}
                />
                <Tooltip
                  content={<BalanceTrendTooltip currencyName={currencyName} />}
                  cursor={{
                    stroke: "var(--brand-soft-strong)",
                    strokeWidth: CHART_CURSOR_WIDTH,
                  }}
                />
                <Area
                  activeDot={{
                    fill: "var(--surface)",
                    r: ACTIVE_CHART_POINT_RADIUS,
                    stroke: "var(--brand)",
                    strokeWidth: CHART_STROKE_WIDTH,
                  }}
                  dataKey="balance"
                  fill="url(#studentBalanceFill)"
                  fillOpacity={1}
                  stroke="var(--brand)"
                  strokeWidth={CHART_STROKE_WIDTH}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </article>
  );
}

function StudentMetricStrip({
  className = "",
  currencyName,
  transactions,
}: {
  className?: string;
  currencyName: string;
  transactions: TransactionLogItem[];
}) {
  const [timeframeDays, setTimeframeDays] =
    useState<StudentMetricTimeframeDays>(30);
  const metrics = getStudentMetrics(transactions, timeframeDays);
  const selectedOption = studentMetricTimeframeOptions.find(
    (option) => option.value === timeframeDays,
  );

  return (
    <section className={`rounded-3xl bg-surface p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Averages</h2>
          <p className="mt-1 text-xs text-text-muted">
            {selectedOption?.label ?? "Month"}
          </p>
        </div>
        <InlineSelectMenu
          ariaLabel="Change average timeframe"
          onChange={setTimeframeDays}
          options={studentMetricTimeframeOptions}
          value={timeframeDays}
        />
      </div>
      <div className="divide-y divide-border-subtle">
        <StudentMetricCard
          label="Avg gain/day"
          currencyName={currencyName}
          value={formatAmount(metrics.averageDailyGain)}
        />
        <StudentMetricCard
          label="Avg loss/day"
          currencyName={currencyName}
          value={formatAmount(metrics.averageDailyLoss)}
        />
      </div>
    </section>
  );
}

function StudentMetricCard({
  currencyName,
  label,
  value,
}: {
  currencyName: string;
  label: string;
  value: string;
}) {
  return (
    <article className="py-3 first:pt-1 last:pb-1">
      <p className="wallet-balance-number text-2xl leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-normal text-text-muted">
        {currencyName}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
    </article>
  );
}

function useAnimatedWholeNumber(targetValue: number) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const currentValueRef = useRef(targetValue);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startValue = currentValueRef.current;
    const valueDifference = targetValue - startValue;

    if (valueDifference === 0) {
      return;
    }

    const animationStart = performance.now();

    function animateBalance(currentTime: number) {
      const elapsedTime = currentTime - animationStart;
      const progress = Math.min(
        elapsedTime / BALANCE_COUNT_ANIMATION_DURATION_MS,
        1,
      );
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + valueDifference * easedProgress);

      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateBalance);
        return;
      }

      currentValueRef.current = targetValue;
      setDisplayValue(targetValue);
    }

    animationFrameRef.current = requestAnimationFrame(animateBalance);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue]);

  return displayValue;
}

function BalanceTrendTooltip({
  active,
  currencyName,
  payload,
}: BalanceTrendTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.tooltipDate}</p>
      <p className="mt-1 text-brand">
        {formatCurrencyAmount(point.balance, currencyName)}
      </p>
      <p className="mt-1 text-xs font-semibold text-text-muted">
        Balance after transaction
      </p>
    </div>
  );
}

function buildBalanceChartPoints(
  transactions: TransactionLogItem[],
  selectedWindow: BalanceHistoryWindow,
  customRange: { endDate: string; startDate: string },
): BalanceTimePoint[] {
  const balanceTransactions = transactions.filter(doesTransactionAffectBalance);
  const { end, start } = getBalanceHistoryRange(selectedWindow, customRange);
  const scale = selectedWindow === "day" ? "hourly" : "daily";
  const openingBalance = balanceTransactions.reduce((total, transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return transactionTime < start.getTime()
      ? total + transaction.amount
      : total;
  }, 0);
  const windowTransactions = balanceTransactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return transactionTime >= start.getTime() && transactionTime <= end.getTime();
  });

  return buildBalanceTimeSeries({
    events: windowTransactions.map((transaction) => ({
      amount: transaction.amount,
      createdAt: transaction.createdAt,
    })),
    rangeEnd: end,
    rangeStart: start,
    scale,
    startingBalance: openingBalance,
  });
}

function getBalanceHistoryRange(
  selectedWindow: BalanceHistoryWindow,
  customRange: { endDate: string; startDate: string },
) {
  const now = new Date();

  if (selectedWindow === "custom") {
    const start = parseDateInput(customRange.startDate, false);
    const end = parseDateInput(customRange.endDate, true);

    if (start && end && start <= end) {
      return { end: end > now ? now : end, start };
    }
  }

  const days = selectedWindow === "day" ? 1 : selectedWindow === "week" ? 7 : 30;
  return { end: now, start: new Date(now.getTime() - days * MILLISECONDS_PER_DAY) };
}

function parseDateInput(value: string, endOfDay: boolean) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function doesTransactionAffectBalance(transaction: TransactionLogItem) {
  return !transaction.isVoided && transaction.entryStatus !== "voided";
}

function getStudentMetrics(
  transactions: TransactionLogItem[],
  timeframeDays: StudentMetricTimeframeDays,
) {
  const windowStartTime =
    Date.now() - timeframeDays * MILLISECONDS_PER_DAY;
  const recentTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();

    return (
      Number.isFinite(transactionTime) &&
      transactionTime >= windowStartTime &&
      doesTransactionAffectBalance(transaction)
    );
  });

  const totalGain = recentTransactions.reduce(
    (total, transaction) =>
      transaction.amount > 0 ? total + transaction.amount : total,
    0,
  );
  const totalLoss = recentTransactions.reduce(
    (total, transaction) =>
      transaction.amount < 0 ? total + Math.abs(transaction.amount) : total,
    0,
  );

  return {
    averageDailyGain: Math.round(totalGain / timeframeDays),
    averageDailyLoss: Math.round(totalLoss / timeframeDays),
  };
}

function ChartScaleMenu({
  onWindowChange,
  selectedWindow,
}: {
  onWindowChange: (window: BalanceHistoryWindow) => void;
  selectedWindow: BalanceHistoryWindow;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <InlineSelectMenu
        ariaLabel="Change balance graph scale"
        onChange={onWindowChange}
        options={balanceHistoryWindowOptions}
        value={selectedWindow}
      />
    </div>
  );
}

function findChartPointLabel(points: BalanceTimePoint[], timestamp: number) {
  return (
    points.find((point) => point.timestamp === timestamp)?.dateLabel ?? ""
  );
}
