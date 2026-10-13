import type { TransactionFilters } from "@/components/transactions/transaction-log-types";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";

export function matchesTransactionFilters(
  transaction: TransactionLogItem,
  filters: TransactionFilters,
) {
  return (
    matchesCreatedDate(transaction.createdAt, filters.createdDate) &&
    (!filters.type || transaction.type === filters.type) &&
    matchesVoidedStatus(transaction.isVoided, filters.voidedStatus) &&
    matchesPurchaseStatus(transaction.purchaseStatus, filters.purchaseStatus) &&
    matchesAmountDirection(transaction.amount, filters.amountDirection) &&
    matchesAmountRange(transaction.amount, filters) &&
    includesFilter(transaction.reason, filters.reason) &&
    includesFilter(
      `${transaction.studentName} ${transaction.studentUsername}`,
      filters.student,
    )
  );
}

function matchesCreatedDate(createdAt: string, filter: string) {
  if (!filter) return true;

  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return false;

  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return localDate === filter;
}

function matchesPurchaseStatus(
  purchaseStatus: TransactionLogItem["purchaseStatus"],
  filter: TransactionFilters["purchaseStatus"],
) {
  if (!filter) {
    return true;
  }

  return purchaseStatus === filter;
}

function matchesVoidedStatus(
  isVoided: boolean,
  status: TransactionFilters["voidedStatus"],
) {
  if (status === "active") {
    return !isVoided;
  }

  if (status === "voided") {
    return isVoided;
  }

  return true;
}

function matchesAmountDirection(
  amount: number,
  direction: TransactionFilters["amountDirection"],
) {
  if (direction === "positive") {
    return amount > 0;
  }

  if (direction === "negative") {
    return amount < 0;
  }

  return true;
}

function matchesAmountRange(amount: number, filters: TransactionFilters) {
  const absoluteAmount = Math.abs(amount);
  const minimumAmount = parseAmountFilter(filters.amountMin);
  const maximumAmount = parseAmountFilter(filters.amountMax);

  if (minimumAmount !== null && absoluteAmount < minimumAmount) {
    return false;
  }

  if (maximumAmount !== null && absoluteAmount > maximumAmount) {
    return false;
  }

  return true;
}

function parseAmountFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.abs(parsedValue);
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
