import type {
  CreditAnalyticsBalanceHistoryPoint,
  CreditAnalyticsBucket,
  CreditAnalyticsTrendPoint,
} from "@/domains/analytics/credit-analytics-service";

export type BalanceHistoryValueKey = "averageBalance" | "totalBalance";

export const chartStrokeWidth = 2;
export const activeChartPointRadius = 5;

const maximumAxisTickCount = 5;

export function getBalanceAxisTicks(
  points: CreditAnalyticsBalanceHistoryPoint[],
  valueKey: BalanceHistoryValueKey,
) {
  const maximumBalance = Math.max(...points.map((point) => point[valueKey]), 0);
  return getAxisTicks(maximumBalance);
}

export function getDistributionAxisTicks(buckets: CreditAnalyticsBucket[]) {
  const maximumCount = Math.max(...buckets.map((bucket) => bucket.count), 0);
  return getAxisTicks(maximumCount);
}

export function getPurchaseAxisTicks(trend: CreditAnalyticsTrendPoint[]) {
  const maximumCount = Math.max(
    ...trend.flatMap((point) => [
      point.approvedPurchases,
      point.deniedPurchases,
      point.pendingPurchases,
    ]),
    0,
  );
  return getAxisTicks(maximumCount);
}

export function getMovementAxisTicks(trend: CreditAnalyticsTrendPoint[]) {
  const values = trend.map((point) => point.net);
  const minimumValue = Math.min(...values, 0);
  const maximumValue = Math.max(...values, 0);
  const largestAbsoluteValue = Math.max(
    Math.abs(minimumValue),
    Math.abs(maximumValue),
    1,
  );
  const positiveTicks = getAxisTicks(largestAbsoluteValue);
  const negativeTicks = positiveTicks
    .slice(1)
    .map((tick) => -tick)
    .reverse();

  return [...negativeTicks, ...positiveTicks];
}

export function getCompactMovementAxisTicks(
  trend: CreditAnalyticsTrendPoint[],
) {
  const ticks = getMovementAxisTicks(trend);

  if (ticks.length <= 5) {
    return ticks;
  }

  const zeroIndex = ticks.indexOf(0);

  if (zeroIndex === -1) {
    return ticks;
  }

  return ticks.filter((_, index) => (index - zeroIndex) % 2 === 0);
}

export function getTimeAxisTicks(
  points: Array<CreditAnalyticsBalanceHistoryPoint | CreditAnalyticsTrendPoint>,
) {
  if (points.length <= 1) {
    return points.map((point) => point.timestamp);
  }

  if (points.length <= maximumAxisTickCount + 1) {
    return points.slice(1).map((point) => point.timestamp);
  }

  const lastIndex = points.length - 1;
  const tickIndexes = new Set<number>();

  for (let index = 0; index < maximumAxisTickCount; index += 1) {
    tickIndexes.add(
      1 + Math.round((index * (lastIndex - 1)) / (maximumAxisTickCount - 1)),
    );
  }

  return Array.from(tickIndexes)
    .sort((firstIndex, secondIndex) => firstIndex - secondIndex)
    .map((index) => points[index].timestamp);
}

export function findPointLabel(
  points: Array<CreditAnalyticsBalanceHistoryPoint | CreditAnalyticsTrendPoint>,
  timestamp: number,
) {
  return points.find((point) => point.timestamp === timestamp)?.label ?? "";
}

function getAxisTicks(maximumValue: number) {
  const interval = getNiceTickInterval(maximumValue);
  const axisMaximum = Math.max(
    interval,
    Math.ceil(maximumValue / interval) * interval,
  );
  const ticks: number[] = [];

  for (let tick = 0; tick <= axisMaximum; tick += interval) {
    ticks.push(tick);
  }

  return ticks;
}

function getNiceTickInterval(maximumValue: number) {
  if (maximumValue <= 0) {
    return 1;
  }

  const roughInterval = maximumValue / (maximumAxisTickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
  const normalizedInterval = roughInterval / magnitude;

  if (normalizedInterval <= 1) {
    return magnitude;
  }

  if (normalizedInterval <= 2) {
    return 2 * magnitude;
  }

  if (normalizedInterval <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}
