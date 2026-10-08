import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";

export function TransactionStatusBadge({
  transaction,
}: {
  transaction: TransactionLogItem;
}) {
  return (
    <StatusBadge
      label={getTransactionStatusLabel(transaction)}
      tone={getTransactionStatusTone(transaction)}
    />
  );
}

function getTransactionStatusLabel(transaction: TransactionLogItem) {
  if (transaction.isVoided) {
    return "Archived";
  }

  if (transaction.entryStatus === "pending") {
    return "Pending";
  }

  if (transaction.purchaseStatus === "pending") {
    return "Pending";
  }

  if (transaction.purchaseStatus === "approved") {
    return "Approved";
  }

  if (transaction.purchaseStatus === "denied") {
    return "Denied";
  }

  return "Active";
}

function getTransactionStatusTone(transaction: TransactionLogItem): StatusTone {
  if (transaction.isVoided || transaction.purchaseStatus === "denied") {
    return "danger";
  }

  if (transaction.entryStatus === "pending") {
    return "warning";
  }

  if (transaction.type === "void_reversal") {
    return "neutral";
  }

  return "success";
}
