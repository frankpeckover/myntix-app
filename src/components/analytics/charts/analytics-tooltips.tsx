import {
  formatAmount,
  formatCurrencyAmount,
  formatSignedCurrencyAmount,
} from "@/lib/presentation/formatters";
import type {
  CreditAnalyticsBalanceHistoryPoint,
  CreditAnalyticsBucket,
  CreditAnalyticsTrendPoint,
} from "@/domains/analytics/credit-analytics-service";

type BalanceHistoryTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: {
    payload: CreditAnalyticsBalanceHistoryPoint;
  }[];
};

type DistributionTooltipProps = {
  active?: boolean;
  payload?: {
    payload: CreditAnalyticsBucket;
  }[];
  totalWallets: number;
};

type PurchaseTrendTooltipProps = {
  active?: boolean;
  payload?: {
    color: string;
    name: string;
    payload: CreditAnalyticsTrendPoint;
    value: number;
  }[];
};

type NetMovementTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: {
    payload: CreditAnalyticsTrendPoint;
  }[];
};

export function BalanceHistoryTooltip({
  active,
  currencyName,
  payload,
}: BalanceHistoryTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.label}</p>
      <div className="mt-2 space-y-1">
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand" />
          <span className="text-text-muted">Total</span>
          <span className="font-semibold text-foreground">
            {formatCurrencyAmount(point.totalBalance, currencyName)}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-text-muted">Average</span>
          <span className="font-semibold text-foreground">
            {formatCurrencyAmount(point.averageBalance, currencyName)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function DistributionTooltip({
  active,
  payload,
  totalWallets,
}: DistributionTooltipProps) {
  const bucket = payload?.[0]?.payload;

  if (!active || !bucket) {
    return null;
  }

  const percentage =
    totalWallets > 0 ? Math.round((bucket.count / totalWallets) * 100) : 0;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{bucket.label}</p>
      <p className="mt-1 text-brand">
        {formatAmount(bucket.count)} wallet{bucket.count === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {percentage}% of selected wallets
      </p>
    </div>
  );
}

export function PurchaseTrendTooltip({
  active,
  payload,
}: PurchaseTrendTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point || !payload) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p className="flex items-center gap-2" key={entry.name}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-muted">{entry.name}</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function NetMovementTooltip({
  active,
  currencyName,
  payload,
}: NetMovementTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.label}</p>
      <p
        className={`mt-1 font-semibold ${
          point.net >= 0 ? "text-success" : "text-danger"
        }`}
      >
        {formatSignedCurrencyAmount(point.net, currencyName)}
      </p>
      <div className="mt-2 space-y-1 text-xs text-text-muted">
        <p>Issued: {formatCurrencyAmount(point.issued, currencyName)}</p>
        <p>Removed: {formatCurrencyAmount(point.removed, currencyName)}</p>
        <p>Spent: {formatCurrencyAmount(point.spent, currencyName)}</p>
      </div>
    </div>
  );
}
