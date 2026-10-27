"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { StudentBestDayCard } from "@/components/student/best-day-card";
import { SimpleStudentDashboard } from "@/components/student/simple-dashboard";
import { MobileStudentDashboard } from "@/components/student/mobile/dashboard-layout";
import { useDashboardLayout } from "@/components/layout/use-dashboard-layout";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { usesSimpleStudentDashboard } from "@/domains/users/year-level";
import {
  studentActivityTimeframeOptions,
  getStudentActivityRange,
  type StudentActivityRange,
  type StudentActivityWindow,
} from "@/components/student/activity-timeframes";
import { StudentTransactionNotificationModal } from "@/components/student/transaction-notification-modal";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { SparkleIcon, TrophyIcon, WalletIcon } from "@/components/ui/icons";
import { InlineSelectMenu } from "@/components/ui/inline-select-menu";
import { LoadFailure } from "@/components/ui/load-failure";
import { PanelTitle } from "@/components/ui/panel-title";
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
import {
  formatAmount,
  formatCurrencyAmount,
  formatSignedAmount,
} from "@/lib/presentation/formatters";
import type { SessionUser } from "@/lib/auth/session";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import type { UnseenTransaction } from "@/domains/ledger/transaction-notification-service";

type StudentDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  onBrowseRewards: () => void;
  onOpenTransactionHistory: (date?: string) => void;
  schoolLogoUrl: string;
  schoolName: string;
};

type BalanceTrendTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: { payload: BalanceTimePoint }[];
};

const ACTIVE_CHART_POINT_RADIUS = 6;
const CHART_STROKE_WIDTH = 2;
const CHART_CURSOR_WIDTH = 2;
const BALANCE_COUNT_ANIMATION_DURATION_MS = 650;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export function StudentDashboardPanel({
  currencyName,
  currentUser,
  onBrowseRewards,
  onOpenTransactionHistory,
  schoolLogoUrl,
  schoolName,
}: StudentDashboardPanelProps) {
  const layout = useDashboardLayout();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [unseenTransactions, setUnseenTransactions] = useState<
    UnseenTransaction[]
  >([]);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [isDismissingNotifications, setIsDismissingNotifications] =
    useState(false);
  const [selectedWindow, setSelectedWindow] =
    useState<StudentActivityWindow>("month");
  const [customStartDate, setCustomStartDate] = useState(() =>
    formatDateInput(addDays(new Date(), -29)),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const activityRange = useMemo(
    () =>
      getStudentActivityRange(selectedWindow, {
        startDate: customStartDate,
        endDate: customEndDate,
      }),
    [selectedWindow, customStartDate, customEndDate],
  );

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
      setNotificationError(
        "Could not dismiss these updates. Please try again.",
      );
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
      {layout === null ? (
        <LoadingSkeleton lines={3} variant="cards" />
      ) : layout === "mobile" ? (
        <MobileStudentDashboard
          balance={balance}
          currencyName={currencyName}
          isLoading={isTransactionsLoading}
          onBrowseRewards={onBrowseRewards}
          onOpenTransactionHistory={onOpenTransactionHistory}
          transactions={transactions}
          wallet={
            <StudentWalletCard
              balance={balance}
              compact
              celebrate={unseenTransactions.some((transaction) => transaction.amount > 0)}
              currencyName={currencyName}
              currentUser={currentUser}
              schoolLogoUrl={schoolLogoUrl}
              schoolName={schoolName}
            />
          }
        />
      ) : usesSimpleStudentDashboard(currentUser.yearLevel) ? (
        <SimpleStudentDashboard
          balance={balance}
          currencyName={currencyName}
          isLoading={isTransactionsLoading}
          onBrowseRewards={onBrowseRewards}
          onOpenTransactionHistory={onOpenTransactionHistory}
          transactions={transactions}
          wallet={
            <StudentWalletCard
              balance={balance}
              celebrate={unseenTransactions.some(
                (transaction) => transaction.amount > 0,
              )}
              currencyName={currencyName}
              currentUser={currentUser}
              schoolLogoUrl={schoolLogoUrl}
              schoolName={schoolName}
            />
          }
        />
      ) : (
        <>
          <div className="mb-2 mt-2 flex flex-wrap items-end justify-end gap-3">
            {selectedWindow === "custom" && (
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                <label className="text-xs font-medium text-text-muted">
                  Start
                  <input
                    className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-control outline-none ring-brand focus:ring-2"
                    max={customEndDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    type="date"
                    value={customStartDate}
                  />
                </label>
                <label className="text-xs font-medium text-text-muted">
                  End
                  <input
                    className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-control outline-none ring-brand focus:ring-2"
                    max={formatDateInput(new Date())}
                    min={customStartDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    type="date"
                    value={customEndDate}
                  />
                </label>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-muted">Period</span>
              <InlineSelectMenu
                ariaLabel="Change student dashboard timeframe"
                onChange={setSelectedWindow}
                options={studentActivityTimeframeOptions}
                value={selectedWindow}
              />
            </div>
          </div>
          <section className="student-dashboard-section dashboard-grid motion-panel mt-2">
            <StudentWalletCard
              balance={balance}
              celebrate={unseenTransactions.some(
                (transaction) => transaction.amount > 0,
              )}
              currencyName={currencyName}
              currentUser={currentUser}
              schoolLogoUrl={schoolLogoUrl}
              schoolName={schoolName}
            />
            <BalanceTrendCard
              currencyName={currencyName}
              isLoading={isTransactionsLoading && !transactionsError}
              range={activityRange}
              selectedWindow={selectedWindow}
              transactions={transactions}
            />
            <StudentGoalCard
              balance={balance}
              className="dashboard-unit-1 dashboard-height-4"
              currencyName={currencyName}
            />
          </section>

          <section className="student-dashboard-section dashboard-grid mt-5">
            <StudentActivityRecap
              className="dashboard-unit-3 dashboard-height-4 lg:row-start-1"
              currencyName={currencyName}
              isLoading={isTransactionsLoading && !transactionsError}
              onBrowseRewards={onBrowseRewards}
              onSelectDate={onOpenTransactionHistory}
              transactions={transactions}
            />
            <StudentShopRequestsPanel
              className="dashboard-unit-3 dashboard-height-3 lg:row-start-2"
              onBrowseRewards={onBrowseRewards}
            />
            <StudentMetricStrip
              className="dashboard-unit-1 dashboard-height-4 lg:row-start-1"
              currencyName={currencyName}
              onBrowseRewards={onBrowseRewards}
              range={activityRange}
              transactions={transactions}
            />
            <StudentBestDayCard
              className="dashboard-unit-1 dashboard-height-3 lg:row-start-2"
              currencyName={currencyName}
              isLoading={isTransactionsLoading && !transactionsError}
              onSelectDate={onOpenTransactionHistory}
              range={activityRange}
              transactions={transactions}
            />
          </section>

          <TransactionLogPanel
            className="student-dashboard-card student-dashboard-transaction-log"
            currencyName={currencyName}
            currentUser={currentUser}
            onViewAll={onOpenTransactionHistory}
            previewLimit={5}
          />
        </>
      )}

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
  compact = false,
  balance,
  celebrate,
  currencyName,
  currentUser,
  schoolLogoUrl,
  schoolName,
}: {
  compact?: boolean;
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
    <article
      className={`student-dashboard-card student-wallet-card dashboard-unit-2 dashboard-height-4 wallet-card rounded-2xl ${celebrate ? "student-wallet-celebrate" : ""}`}
    >
      <div className={`relative flex h-full flex-col ${compact ? "min-h-40" : "min-h-52"}`}>
        <div className={`relative z-10 flex flex-1 flex-col ${compact ? "p-4" : "p-5 sm:p-6"}`}>
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
            <p className="max-w-28 truncate text-right text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--student-card-muted)] sm:max-w-56">
              {schoolName}
            </p>
          </div>

          <div className={compact ? "flex flex-1 items-center py-4" : "grid flex-1 grid-cols-[minmax(0,1.35fr)_minmax(7rem,0.65fr)] items-center gap-4 py-4 max-[360px]:grid-cols-[minmax(0,1fr)_5rem] max-[360px]:gap-2"}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 break-words text-[color:var(--student-card-text)]">
                <span className={`wallet-balance-number leading-none ${compact ? "text-5xl" : "text-6xl max-[360px]:text-5xl sm:text-7xl"}`}>
                  {formatAmount(balanceAmount)}
                </span>
                <span className="text-base font-medium text-[color:var(--student-card-accent)] sm:text-lg">
                  {currencyName}
                </span>
              </p>
            </div>
            {!compact && <p
              aria-label={cardDate ? `Today's date ${cardDate}` : undefined}
              className="min-h-5 text-right font-number text-lg font-medium tracking-[0.18em] text-[color:var(--student-card-muted)] max-[360px]:text-base max-[360px]:tracking-[0.12em] sm:text-xl"
            >
              {cardDate}
            </p>}
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
  range,
  selectedWindow,
  transactions,
}: {
  currencyName: string;
  isLoading: boolean;
  range: StudentActivityRange;
  selectedWindow: StudentActivityWindow;
  transactions: TransactionLogItem[];
}) {
  const chartPoints = buildBalanceChartPoints(
    transactions,
    selectedWindow,
    range,
  );
  const balanceTicks = getBalanceAxisTicks(chartPoints);
  const balanceLabelTicks = [
    balanceTicks[0],
    balanceTicks[Math.floor((balanceTicks.length - 1) / 2)],
    balanceTicks[balanceTicks.length - 1],
  ].filter((tick, index, values) => values.indexOf(tick) === index);
  const timeTicks = getTimeAxisTicks(chartPoints, 4);

  return (
    <article className="student-dashboard-card student-balance-trend-card dashboard-unit-1 dashboard-height-4 flex min-h-52 rounded-2xl border border-transparent bg-surface p-4 sm:p-5">
      <div className="flex min-h-56 w-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-brand">
              <WalletIcon className="h-4 w-4" />
            </span>
            <PanelTitle title="Balance" />
          </div>
        </div>
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-text-muted">Loading trend...</p>
          </div>
        )}
        {!isLoading && chartPoints.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-sm text-text-muted">No balance history yet.</p>
          </div>
        )}
        {!isLoading && chartPoints.length > 0 && (
          <div className="mt-2 h-56 w-full flex-1">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                accessibilityLayer
                data={chartPoints}
                margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
              >
                <defs>
                  <linearGradient
                    id="studentBalanceFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--brand)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--brand)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeOpacity={0.35}
                  horizontalValues={balanceLabelTicks}
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
                  tick={false}
                  tickLine={false}
                  type="number"
                  width={8}
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
  onBrowseRewards,
  range,
  transactions,
}: {
  className?: string;
  currencyName: string;
  onBrowseRewards: () => void;
  range: StudentActivityRange;
  transactions: TransactionLogItem[];
}) {
  const metrics = getStudentMetrics(transactions, range);

  return (
    <section
      className={`student-dashboard-card student-metric-strip flex min-w-0 flex-col rounded-2xl bg-surface p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PanelTitle title="Activity snapshot" />
      </div>

      {metrics.hasActivity ? (
        <div className="flex flex-1 flex-col justify-center">
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-text-muted">Average net per day</p>
              <p
                className={`mt-1 font-number text-2xl font-semibold leading-none ${metrics.averageDailyNet >= 0 ? "text-positive-ink" : "text-negative-ink"}`}
              >
                {formatSignedAmount(metrics.averageDailyNet)}
                <span className="ml-1 text-xs font-medium text-text-muted">
                  {currencyName}
                </span>
              </p>
              <p
                aria-label={formatMetricComparison(
                  metrics.comparison,
                  currencyName,
                )}
                className={`mt-1.5 text-[11px] font-medium ${metrics.comparison > 0 ? "text-positive-ink" : metrics.comparison < 0 ? "text-negative-ink" : "text-text-muted"}`}
                tabIndex={0}
                title={formatMetricComparison(metrics.comparison, currencyName)}
              >
                {metrics.comparison > 0
                  ? "Improving"
                  : metrics.comparison < 0
                    ? "Trending lower"
                    : "Holding steady"}
              </p>
            </div>
            <MiniMetricSparkline values={metrics.trend} />
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            <CreditMovementSplitBar
              earned={metrics.totalGain}
              spent={metrics.totalLoss}
              currencyName={currencyName}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 flex min-h-40 flex-col justify-between gap-4 rounded-xl bg-panel-soft px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-control">
              No activity in this period
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Your averages and trends will appear after your next credit
              activity.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-md bg-surface px-3 text-sm font-semibold text-text-control transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={onBrowseRewards}
            type="button"
          >
            <TrophyIcon className="h-4 w-4" />
            Explore rewards
          </button>
        </div>
      )}
    </section>
  );
}

function CreditMovementSplitBar({
  currencyName,
  earned,
  spent,
}: {
  currencyName: string;
  earned: number;
  spent: number;
}) {
  const totalMovement = earned + spent;
  const earnedShare = totalMovement > 0 ? (earned / totalMovement) * 100 : 0;
  const spentShare = totalMovement > 0 ? (spent / totalMovement) * 100 : 0;
  const description = `Earned ${formatCurrencyAmount(earned, currencyName)} (${Math.round(earnedShare)}%); spent ${formatCurrencyAmount(spent, currencyName)} (${Math.round(spentShare)}%) in this period.`;

  return (
    <div
      aria-label={description}
      className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      role="img"
      tabIndex={0}
      title={description}
    >
      <div
        aria-hidden="true"
        className="flex h-3.5 overflow-hidden rounded-full bg-panel-soft"
      >
        <span
          className="block h-full bg-positive-ink transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${earnedShare}%` }}
        />
        <span
          className="block h-full bg-negative-ink transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${spentShare}%` }}
        />
      </div>
      <div aria-hidden="true" className="mt-2 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">Earned</p>
          <p className="mt-0.5 font-number text-base font-semibold text-positive-ink">
            {formatSignedAmount(earned)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs text-text-muted">Spent</p>
          <p className="mt-0.5 font-number text-base font-semibold text-negative-ink">
            {formatSignedAmount(-spent)}
          </p>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="mt-1 text-center text-[11px] text-text-muted"
      >
        {currencyName} this period
      </p>
    </div>
  );
}

function MiniMetricSparkline({ values }: { values: number[] }) {
  const width = 92;
  const height = 38;
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 0);
  const range = Math.max(maximum - minimum, 1);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * width},${height - ((value - minimum) / range) * height}`,
    )
    .join(" ");
  return (
    <svg
      aria-label="Net movement trend"
      className="h-10 w-24"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        points={points}
        stroke="var(--brand)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentValueRef.current = targetValue;
      const frameId = requestAnimationFrame(() => setDisplayValue(targetValue));
      return () => cancelAnimationFrame(frameId);
    }

    const animationStart = performance.now();

    function animateBalance(currentTime: number) {
      const elapsedTime = currentTime - animationStart;
      const progress = Math.min(
        elapsedTime / BALANCE_COUNT_ANIMATION_DURATION_MS,
        1,
      );
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(
        startValue + valueDifference * easedProgress,
      );

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
  selectedWindow: StudentActivityWindow,
  range: StudentActivityRange,
): BalanceTimePoint[] {
  const balanceTransactions = transactions.filter(doesTransactionAffectBalance);
  const { end, start } = range;
  const scale = selectedWindow === "day" ? "hourly" : "daily";
  const openingBalance = balanceTransactions.reduce((total, transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return transactionTime < start.getTime()
      ? total + transaction.amount
      : total;
  }, 0);
  const windowTransactions = balanceTransactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return (
      transactionTime >= start.getTime() && transactionTime <= end.getTime()
    );
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
  range: StudentActivityRange,
) {
  const windowEndTime = range.end.getTime();
  const windowStartTime = range.start.getTime();
  const duration = windowEndTime - windowStartTime;
  const timeframeDays = Math.max(1, duration / MILLISECONDS_PER_DAY);
  const previousWindowStartTime = windowStartTime - duration;
  const validTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return (
      Number.isFinite(transactionTime) &&
      doesTransactionAffectBalance(transaction)
    );
  });
  const recentTransactions = validTransactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return (
      transactionTime >= windowStartTime && transactionTime <= windowEndTime
    );
  });
  const previousTransactions = validTransactions.filter((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    return (
      transactionTime >= previousWindowStartTime &&
      transactionTime < windowStartTime
    );
  });

  const totalGain = getPositiveTotal(recentTransactions);
  const totalLoss = getNegativeTotal(recentTransactions);
  const previousNet =
    getPositiveTotal(previousTransactions) -
    getNegativeTotal(previousTransactions);
  const averageDailyGain = Math.round(totalGain / timeframeDays);
  const averageDailyLoss = Math.round(totalLoss / timeframeDays);
  const averageDailyNet = averageDailyGain - averageDailyLoss;
  const previousAverageDailyNet = Math.round(previousNet / timeframeDays);

  return {
    averageDailyNet,
    totalGain,
    totalLoss,
    comparison: averageDailyNet - previousAverageDailyNet,
    hasActivity: recentTransactions.length > 0,
    trend: buildMetricTrend(recentTransactions, windowStartTime, windowEndTime),
  };
}

function getPositiveTotal(transactions: TransactionLogItem[]) {
  return transactions.reduce(
    (total, transaction) =>
      transaction.amount > 0 ? total + transaction.amount : total,
    0,
  );
}

function getNegativeTotal(transactions: TransactionLogItem[]) {
  return transactions.reduce(
    (total, transaction) =>
      transaction.amount < 0 ? total + Math.abs(transaction.amount) : total,
    0,
  );
}

function buildMetricTrend(
  transactions: TransactionLogItem[],
  startTime: number,
  endTime: number,
) {
  const bucketCount = 7;
  const bucketDuration = Math.max((endTime - startTime) / bucketCount, 1);
  const values = Array.from({ length: bucketCount }, () => 0);

  transactions.forEach((transaction) => {
    const transactionTime = new Date(transaction.createdAt).getTime();
    const bucketIndex = Math.min(
      Math.floor((transactionTime - startTime) / bucketDuration),
      bucketCount - 1,
    );
    if (bucketIndex >= 0) values[bucketIndex] += transaction.amount;
  });

  let cumulative = 0;
  return values.map((value) => (cumulative += value));
}

function formatMetricComparison(comparison: number, currencyName: string) {
  if (comparison === 0) return "Matching the previous period";
  return `${formatAmount(Math.abs(comparison))} ${currencyName} ${
    comparison > 0 ? "better" : "lower"
  } per day than the previous period`;
}

function findChartPointLabel(points: BalanceTimePoint[], timestamp: number) {
  return points.find((point) => point.timestamp === timestamp)?.dateLabel ?? "";
}
