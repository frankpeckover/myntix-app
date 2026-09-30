"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import {
  activeChartPointRadius,
  chartStrokeWidth,
  findPointLabel,
  getBalanceAxisTicks,
  getCompactMovementAxisTicks,
  getDistributionAxisTicks,
  getMovementAxisTicks,
  getPurchaseAxisTicks,
  getTimeAxisTicks,
} from "@/components/analytics/charts/analytics-chart-utils";
import {
  BalanceHistoryTooltip,
  DistributionTooltip,
  NetMovementTooltip,
  PurchaseTrendTooltip,
} from "@/components/analytics/charts/analytics-tooltips";
import {
  ClockIcon,
  ShoppingBagIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { InlineSelectMenu } from "@/components/ui/inline-select-menu";
import { LoadFailure } from "@/components/ui/load-failure";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchInput } from "@/components/ui/search-input";
import {
  getCreditAnalyticsSummary,
  searchCreditAnalyticsScopes,
} from "@/lib/actions";
import type {
  CreditAnalyticsBucket,
  CreditAnalyticsBalanceHistoryPoint,
  CreditAnalyticsScope,
  CreditAnalyticsSummary,
  CreditAnalyticsTrendPoint,
} from "@/domains/analytics/credit-analytics-service";

type CreditAnalyticsPanelProps = {
  currencyName: string;
};

type AnalyticsWindowOption = {
  days: number;
  label: string;
};

type AnalyticsWindowKey = number | "custom";

const analyticsSearchDebounceMs = 300;
const analyticsWindowOptions: AnalyticsWindowOption[] = [
  { days: 1, label: "Today" },
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
];
const scopeSearchDebounceMs = 250;

export function CreditAnalyticsPanel({
  currencyName,
}: CreditAnalyticsPanelProps) {
  const [scopeQuery, setScopeQuery] = useState("");
  const [scopeResults, setScopeResults] = useState<CreditAnalyticsScope[]>([]);
  const [selectedScope, setSelectedScope] =
    useState<CreditAnalyticsScope | null>(null);
  const [selectedWindowKey, setSelectedWindowKey] =
    useState<AnalyticsWindowKey>(30);
  const [customStartDate, setCustomStartDate] = useState(() =>
    formatDateInput(addDays(new Date(), -29)),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [balanceHistory, setBalanceHistory] = useState<
    CreditAnalyticsBalanceHistoryPoint[]
  >([]);
  const [balanceBuckets, setBalanceBuckets] = useState<CreditAnalyticsBucket[]>(
    [],
  );
  const [summary, setSummary] = useState<CreditAnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<CreditAnalyticsTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedScopeKey = selectedScope
    ? `${selectedScope.kind}:${selectedScope.id}`
    : "cohort";
  const selectedWindowInput = useMemo(
    () =>
      selectedWindowKey === "custom"
        ? {
            endDate: customEndDate,
            startDate: customStartDate,
          }
        : selectedWindowKey,
    [customEndDate, customStartDate, selectedWindowKey],
  );
  const selectedWindowLabel =
    selectedWindowKey === "custom"
      ? formatCustomWindowLabel(customStartDate, customEndDate)
      : selectedWindowKey === 1
        ? "today"
        : `${selectedWindowKey} days`;

  useEffect(() => {
    let isMounted = true;

    if (scopeQuery.trim().length < 2) {
      const timeoutId = window.setTimeout(() => {
        if (isMounted) {
          setScopeResults([]);
        }
      }, 0);

      return () => {
        isMounted = false;
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const scopes = await searchCreditAnalyticsScopes(scopeQuery);

        if (isMounted) {
          setScopeResults(scopes);
        }
      } catch {
        if (isMounted) {
          setScopeResults([]);
        }
      }
    }, scopeSearchDebounceMs);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [scopeQuery]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const analytics = await getCreditAnalyticsSummary(
          selectedScopeKey,
          selectedWindowInput,
        );

        if (isMounted) {
          setBalanceBuckets(analytics.balanceBuckets);
          setBalanceHistory(analytics.balanceHistory);
          setSummary(analytics.summary);
          setTrend(analytics.trend);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setBalanceBuckets([]);
          setBalanceHistory([]);
          setSummary(null);
          setTrend([]);
          setError("Could not load analytics.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, analyticsSearchDebounceMs);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [customEndDate, customStartDate, reloadKey, selectedScopeKey, selectedWindowInput]);

  function handleScopeSelected(scope: CreditAnalyticsScope) {
    setSelectedScope(scope);
    setScopeQuery("");
    setScopeResults([]);
  }

  function handleScopeCleared() {
    setSelectedScope(null);
    setScopeQuery("");
    setScopeResults([]);
  }

  return (
    <div className="mt-5">
      <FixedNotification error={error} />
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <AnalyticsScopePicker
            onScopeClear={handleScopeCleared}
            onScopeQueryChange={setScopeQuery}
            onScopeSelect={handleScopeSelected}
            query={scopeQuery}
            results={scopeResults}
            selectedScope={selectedScope}
          />
        </div>
        <AnalyticsWindowSelector
          onWindowChange={setSelectedWindowKey}
          selectedWindowKey={selectedWindowKey}
        />
      </div>
      {selectedWindowKey === "custom" && (
        <CustomAnalyticsDateRange
          endDate={customEndDate}
          onEndDateChange={setCustomEndDate}
          onStartDateChange={setCustomStartDate}
          startDate={customStartDate}
        />
      )}

      {!isLoading && error && (
        <div className="mt-4">
          <LoadFailure
            description="The selected analytics could not be retrieved. Your filters are still applied."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not load analytics"
          />
        </div>
      )}

      {!error && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <AnalyticsMetricGrid
            className="lg:col-span-2"
            currencyName={currencyName}
            isLoading={isLoading}
            selectedWindowLabel={selectedWindowLabel}
            summary={summary}
          />
          <NetMovementCard
            className="lg:col-span-4"
            currencyName={currencyName}
            error={error}
            isLoading={isLoading}
            scopeLabel={selectedScope?.label ?? "Cohort"}
            trend={trend}
          />
        </div>
      )}

      {!error && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <BalanceHistoryCard
            className="lg:col-span-4"
            currencyName={currencyName}
            error={error}
            isLoading={isLoading}
            points={balanceHistory}
            scopeLabel={selectedScope?.label ?? "Cohort"}
          />
          <BalanceDistributionCard
            className="lg:col-span-2"
            buckets={balanceBuckets}
            error={error}
            isLoading={isLoading}
            scopeLabel={selectedScope?.label ?? "Cohort"}
            summary={summary}
          />
          <PurchaseTrendCard
            className="lg:col-span-2"
            error={error}
            isLoading={isLoading}
            scopeLabel={selectedScope?.label ?? "Cohort"}
            trend={trend}
          />
        </div>
      )}
    </div>
  );
}

function AnalyticsMetricGrid({
  className,
  currencyName,
  isLoading,
  selectedWindowLabel,
  summary,
}: {
  className: string;
  currencyName: string;
  isLoading: boolean;
  selectedWindowLabel: string;
  summary: CreditAnalyticsSummary | null;
}) {
  return (
    <section className={`${className} grid grid-cols-2 gap-3`}>
      <MetricCard
        icon={<UsersIcon />}
        label={`Active ${selectedWindowLabel}`}
        tone="brand"
        value={
          summary
            ? `${summary.studentsWithRecentActivity} of ${summary.activeStudentCount}`
            : getLoadingMetricValue(isLoading)
        }
      />
      <MetricCard
        icon={<ShoppingBagIcon />}
        label="Reward requests"
        tone="accent"
        value={
          summary
            ? `${summary.activeShopRequests}`
            : getLoadingMetricValue(isLoading)
        }
      />
      <MetricCard
        icon={<WalletIcon />}
        label={`Total ${currencyName}`}
        tone="success"
        value={
          summary
            ? formatWholeNumber(summary.totalHeld)
            : getLoadingMetricValue(isLoading)
        }
      />
      <MetricCard
        icon={<ClockIcon />}
        label="Pending holds"
        tone="neutral"
        value={
          summary
            ? formatWholeNumber(summary.pendingHolds)
            : getLoadingMetricValue(isLoading)
        }
      />
    </section>
  );
}

function AnalyticsWindowSelector({
  onWindowChange,
  selectedWindowKey,
}: {
  onWindowChange: (windowKey: AnalyticsWindowKey) => void;
  selectedWindowKey: AnalyticsWindowKey;
}) {
  return (
    <div className="flex h-[46px] shrink-0 items-center">
      <InlineSelectMenu
        ariaLabel="Change analytics time window"
        onChange={onWindowChange}
        options={[
          ...analyticsWindowOptions.map((option) => ({
            label: option.label,
            value: option.days,
          })),
          { label: "Custom", value: "custom" as const },
        ]}
        value={selectedWindowKey}
      />
    </div>
  );
}

function CustomAnalyticsDateRange({
  endDate,
  onEndDateChange,
  onStartDateChange,
  startDate,
}: {
  endDate: string;
  onEndDateChange: (date: string) => void;
  onStartDateChange: (date: string) => void;
  startDate: string;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-medium text-text-muted">
        Start
        <input
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-control outline-none ring-brand transition focus:ring-2"
          max={endDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          type="date"
          value={startDate}
        />
      </label>
      <label className="text-xs font-medium text-text-muted">
        End
        <input
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-control outline-none ring-brand transition focus:ring-2"
          min={startDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          type="date"
          value={endDate}
        />
      </label>
    </div>
  );
}

function NetMovementCard({
  className,
  currencyName,
  error,
  isLoading,
  scopeLabel,
  trend,
}: {
  className: string;
  currencyName: string;
  error: string | null;
  isLoading: boolean;
  scopeLabel: string;
  trend: CreditAnalyticsTrendPoint[];
}) {
  return (
    <section className={`${className} theme-panel min-w-0 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          Daily movement
        </h3>
        <span className="rounded-sm bg-chip-bg px-2 py-1 text-xs font-semibold text-chip-text">
          {scopeLabel}
        </span>
      </div>

      {!error && isLoading && (
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-text-muted">Loading analytics...</p>
        </div>
      )}

      {!error && !isLoading && trend.length === 0 && (
        <div className="flex h-52 items-center justify-center text-center">
          <p className="text-sm text-text-muted">No movement history found.</p>
        </div>
      )}

      {!error && !isLoading && trend.length > 0 && (
        <NetMovementChart currencyName={currencyName} trend={trend} />
      )}
    </section>
  );
}

function NetMovementChart({
  currencyName,
  trend,
}: {
  currencyName: string;
  trend: CreditAnalyticsTrendPoint[];
}) {
  const yAxisTicks = getMovementAxisTicks(trend);
  const compactYAxisTicks = getCompactMovementAxisTicks(trend);
  const yAxisMinimum = yAxisTicks[0] ?? -1;
  const yAxisMaximum = yAxisTicks[yAxisTicks.length - 1] ?? 1;
  const xAxisTicks = getTimeAxisTicks(trend);

  return (
    <div className="mt-4 h-52 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={trend}
          margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
        >
          <CartesianGrid
            horizontal={false}
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="timestamp"
            domain={["dataMin", "dataMax"]}
            minTickGap={12}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(timestamp) =>
              findPointLabel(trend, Number(timestamp))
            }
            tickLine={false}
            ticks={xAxisTicks}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[yAxisMinimum, yAxisMaximum]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            ticks={compactYAxisTicks}
            type="number"
            width={42}
          />
          {compactYAxisTicks.map((tick) => (
            <ReferenceLine
              ifOverflow="extendDomain"
              key={tick}
              stroke="var(--border-subtle)"
              strokeOpacity={0.45}
              y={tick}
            />
          ))}
          <Tooltip
            content={<NetMovementTooltip currencyName={currencyName} />}
            cursor={false}
          />
          <Bar
            activeBar={{
              fillOpacity: 0.85,
              stroke: "var(--brand)",
              strokeOpacity: 0.45,
              strokeWidth: 1,
            }}
            dataKey="net"
            radius={[6, 6, 2, 2]}
          >
            {trend.map((point) => (
              <Cell
                fill={point.net >= 0 ? "var(--success)" : "var(--danger)"}
                key={point.timestamp}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function getLoadingMetricValue(isLoading: boolean) {
  return isLoading ? "..." : "-";
}

function formatWholeNumber(amount: number) {
  return new Intl.NumberFormat("en-AU").format(amount);
}

function BalanceHistoryCard({
  className,
  currencyName,
  error,
  isLoading,
  points,
  scopeLabel,
}: {
  className: string;
  currencyName: string;
  error: string | null;
  isLoading: boolean;
  points: CreditAnalyticsBalanceHistoryPoint[];
  scopeLabel: string;
}) {
  return (
    <section className={`${className} theme-panel min-w-0 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Balance history
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Average
            </span>
          </div>
        </div>
        <span className="rounded-sm bg-chip-bg px-2 py-1 text-xs font-semibold text-chip-text">
          {scopeLabel}
        </span>
      </div>

      {!error && isLoading && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-text-muted">Loading analytics...</p>
        </div>
      )}

      {!error && !isLoading && points.length === 0 && (
        <div className="flex h-64 items-center justify-center text-center">
          <p className="text-sm text-text-muted">No credit history found.</p>
        </div>
      )}

      {!error && !isLoading && points.length > 0 && (
        <BalanceHistoryChart
          currencyName={currencyName}
          points={points}
        />
      )}
    </section>
  );
}

function AnalyticsScopePicker({
  onScopeClear,
  onScopeQueryChange,
  onScopeSelect,
  query,
  results,
  selectedScope,
}: {
  onScopeClear: () => void;
  onScopeQueryChange: (query: string) => void;
  onScopeSelect: (scope: CreditAnalyticsScope) => void;
  query: string;
  results: CreditAnalyticsScope[];
  selectedScope: CreditAnalyticsScope | null;
}) {
  return (
    <div className="relative">
      <SearchInput
        aria-label="Search analytics scope"
        onChange={onScopeQueryChange}
        placeholder="Search a student or group"
        value={query}
      />

      {selectedScope && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-2 rounded-md bg-chip-bg px-3 py-2 text-sm font-semibold text-chip-text">
            <span className="truncate">
              {formatScopeKind(selectedScope.kind)}: {selectedScope.label}
            </span>
            <button
              className="rounded-sm px-1 text-xs font-bold transition hover:bg-surface"
              onClick={onScopeClear}
              type="button"
            >
              Clear
            </button>
          </span>
        </div>
      )}

      {query.trim().length >= 2 && results.length > 0 && (
        <div className="motion-pop absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          {results.map((scope) => (
            <button
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm transition hover:bg-brand-soft"
              key={`${scope.kind}:${scope.id}`}
              onClick={() => onScopeSelect(scope)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">
                  {scope.label}
                </span>
                <span className="block truncate text-xs text-text-muted">
                  {scope.meta}
                </span>
              </span>
              <span className="rounded-sm bg-chip-bg px-2 py-1 text-xs font-semibold text-chip-text">
                {formatScopeKind(scope.kind)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatScopeKind(kind: CreditAnalyticsScope["kind"]) {
  if (kind === "student") {
    return "Student";
  }

  if (kind === "group") {
    return "Group";
  }

  return "Cohort";
}

function BalanceHistoryChart({
  currencyName,
  points,
}: {
  currencyName: string;
  points: CreditAnalyticsBalanceHistoryPoint[];
}) {
  const totalAxisTicks = getBalanceAxisTicks(points, "totalBalance");
  const averageAxisTicks = getBalanceAxisTicks(points, "averageBalance");
  const xAxisTicks = getTimeAxisTicks(points);
  const totalAxisMax = totalAxisTicks[totalAxisTicks.length - 1] ?? 1;
  const averageAxisMax = averageAxisTicks[averageAxisTicks.length - 1] ?? 1;

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={points}
          margin={{ bottom: 0, left: 0, right: 0, top: 8 }}
        >
          <defs>
            <linearGradient
              id="analyticsTotalBalanceFill"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
            <linearGradient
              id="analyticsAverageBalanceFill"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.16} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
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
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(timestamp) =>
              findPointLabel(points, Number(timestamp))
            }
            tickLine={false}
            ticks={xAxisTicks}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[0, totalAxisMax]}
            yAxisId="total"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            ticks={totalAxisTicks}
            type="number"
            width={42}
          />
          <YAxis
            axisLine={false}
            domain={[0, averageAxisMax]}
            orientation="right"
            yAxisId="average"
            tick={{ fill: "var(--accent)", fontSize: 11 }}
            tickLine={false}
            ticks={averageAxisTicks}
            type="number"
            width={42}
          />
          {totalAxisTicks.map((tick) => (
            <ReferenceLine
              ifOverflow="extendDomain"
              key={tick}
              stroke="var(--border-subtle)"
              strokeOpacity={0.45}
              y={tick}
              yAxisId="total"
            />
          ))}
          <Tooltip
            content={
              <BalanceHistoryTooltip
                currencyName={currencyName}
              />
            }
            cursor={{
              stroke: "var(--brand-soft-strong)",
              strokeWidth: chartStrokeWidth,
            }}
          />
          <Area
            activeDot={{
              fill: "var(--surface)",
              r: activeChartPointRadius,
              stroke: "var(--brand)",
              strokeWidth: chartStrokeWidth,
            }}
            dataKey="totalBalance"
            fill="url(#analyticsTotalBalanceFill)"
            fillOpacity={1}
            stroke="var(--brand)"
            strokeWidth={chartStrokeWidth}
            type="monotone"
            yAxisId="total"
          />
          <Area
            activeDot={{
              fill: "var(--surface)",
              r: activeChartPointRadius,
              stroke: "var(--accent)",
              strokeWidth: chartStrokeWidth,
            }}
            dataKey="averageBalance"
            fill="url(#analyticsAverageBalanceFill)"
            fillOpacity={1}
            stroke="var(--accent)"
            strokeWidth={chartStrokeWidth}
            type="monotone"
            yAxisId="average"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BalanceDistributionCard({
  buckets,
  className,
  error,
  isLoading,
  scopeLabel,
  summary,
}: {
  buckets: CreditAnalyticsBucket[];
  className: string;
  error: string | null;
  isLoading: boolean;
  scopeLabel: string;
  summary: CreditAnalyticsSummary | null;
}) {
  return (
    <section className={`${className} theme-panel min-w-0 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          Balance distribution
        </h3>
        <span className="rounded-sm bg-chip-bg px-2 py-1 text-xs font-semibold text-chip-text">
          {scopeLabel}
        </span>
      </div>

      {!error && isLoading && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-text-muted">Loading analytics...</p>
        </div>
      )}

      {!error && !isLoading && buckets.length === 0 && (
        <div className="flex h-64 items-center justify-center text-center">
          <p className="text-sm text-text-muted">No balances found.</p>
        </div>
      )}

      {!error && !isLoading && buckets.length > 0 && (
        <>
          <BalanceDistributionSummary summary={summary} />
          <BalanceDistributionChart
            buckets={buckets}
            medianBalance={summary?.medianBalance ?? 0}
            totalWallets={summary?.activeStudentCount ?? 0}
          />
        </>
      )}
    </section>
  );
}

function BalanceDistributionSummary({
  summary,
}: {
  summary: CreditAnalyticsSummary | null;
}) {
  if (!summary) {
    return null;
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-b border-border-subtle pb-3 text-xs">
      <CompactDistributionStat
        label="Median"
        value={formatWholeNumber(summary.medianBalance)}
      />
      <CompactDistributionStat
        label="Average"
        value={formatWholeNumber(summary.averageBalance)}
      />
      <CompactDistributionStat
        label="Zero"
        value={formatWholeNumber(summary.zeroBalanceCount)}
      />
    </div>
  );
}

function CompactDistributionStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-number truncate text-base font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 truncate text-text-muted">{label}</p>
    </div>
  );
}

function BalanceDistributionChart({
  buckets,
  medianBalance,
  totalWallets,
}: {
  buckets: CreditAnalyticsBucket[];
  medianBalance: number;
  totalWallets: number;
}) {
  const xAxisTicks = getDistributionAxisTicks(buckets);
  const xAxisMax = xAxisTicks[xAxisTicks.length - 1] ?? 1;

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={buckets}
          layout="vertical"
          margin={{ bottom: 0, left: 8, right: 8, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--border-subtle)"
            strokeOpacity={0.45}
            horizontal={false}
          />
          <XAxis
            axisLine={false}
            domain={[0, xAxisMax]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            ticks={xAxisTicks}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            type="category"
            width={62}
          />
          <Tooltip
            content={<DistributionTooltip totalWallets={totalWallets} />}
            cursor={false}
          />
          <Bar
            activeBar={{
              fill: "var(--brand)",
              fillOpacity: 0.85,
              stroke: "var(--brand)",
              strokeOpacity: 0.55,
              strokeWidth: 1,
            }}
            dataKey="count"
            radius={[3, 8, 8, 3]}
          >
            {buckets.map((bucket) => (
              <Cell
                fill={
                  isMedianBucket(bucket.label, medianBalance)
                    ? "var(--brand)"
                    : "var(--brand-soft-strong)"
                }
                key={bucket.label}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function isMedianBucket(label: string, medianBalance: number) {
  if (medianBalance < 0) {
    return false;
  }

  if (label === "0") {
    return medianBalance === 0;
  }

  if (label.endsWith("+")) {
    const minimum = Number(label.slice(0, -1));
    return Number.isFinite(minimum) && medianBalance >= minimum;
  }

  const [minimum, maximum] = label.split("-").map((value) => Number(value));

  return (
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    medianBalance >= minimum &&
    medianBalance <= maximum
  );
}

function PurchaseTrendCard({
  className,
  error,
  isLoading,
  scopeLabel,
  trend,
}: {
  className: string;
  error: string | null;
  isLoading: boolean;
  scopeLabel: string;
  trend: CreditAnalyticsTrendPoint[];
}) {
  return (
    <section className={`${className} theme-panel min-w-0 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          Reward trends
        </h3>
        <span className="rounded-sm bg-chip-bg px-2 py-1 text-xs font-semibold text-chip-text">
          {scopeLabel}
        </span>
      </div>

      {!error && isLoading && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-text-muted">Loading analytics...</p>
        </div>
      )}

      {!error && !isLoading && trend.length === 0 && (
        <div className="flex h-64 items-center justify-center text-center">
          <p className="text-sm text-text-muted">No purchasing history found.</p>
        </div>
      )}

      {!error && !isLoading && trend.length > 0 && (
        <PurchaseTrendChart trend={trend} />
      )}
    </section>
  );
}

function PurchaseTrendChart({
  trend,
}: {
  trend: CreditAnalyticsTrendPoint[];
}) {
  const yAxisTicks = getPurchaseAxisTicks(trend);
  const yAxisMax = yAxisTicks[yAxisTicks.length - 1] ?? 1;
  const xAxisTicks = getTimeAxisTicks(trend);

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={trend}
          margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
        >
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
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(timestamp) =>
              findPointLabel(trend, Number(timestamp))
            }
            tickLine={false}
            ticks={xAxisTicks}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[0, yAxisMax]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            ticks={yAxisTicks}
            type="number"
            width={32}
          />
          <Tooltip
            content={<PurchaseTrendTooltip />}
            cursor={false}
          />
          <Bar
            activeBar={{ fill: "var(--brand-hover)" }}
            dataKey="pendingPurchases"
            fill="var(--brand)"
            name="Pending"
            radius={[7, 7, 2, 2]}
          />
          <Bar
            activeBar={{ fill: "var(--success-hover)" }}
            dataKey="approvedPurchases"
            fill="var(--success)"
            name="Approved"
            radius={[7, 7, 2, 2]}
          />
          <Bar
            activeBar={{ fill: "var(--danger-strong)" }}
            dataKey="deniedPurchases"
            fill="var(--danger)"
            name="Denied"
            radius={[7, 7, 2, 2]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
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

function formatCustomWindowLabel(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return "custom range";
  }

  if (startDate === endDate) {
    return startDate;
  }

  return `${startDate} to ${endDate}`;
}
