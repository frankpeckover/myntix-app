"use client";

import type { UnseenTransaction } from "@/domains/ledger/transaction-notification-service";
import { getSignedAmountTextClassName } from "@/lib/amount-style";
import {
  formatCurrencyAmount,
  formatDateTime,
  formatSignedCurrencyAmount,
} from "@/lib/formatters";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { ModalShell } from "@/components/ui/modal-shell";

type StudentTransactionNotificationModalProps = {
  currencyName: string;
  error: string | null;
  isDismissing: boolean;
  onDismiss: () => void;
  transactions: UnseenTransaction[];
};

export function StudentTransactionNotificationModal({
  currencyName,
  error,
  isDismissing,
  onDismiss,
  transactions,
}: StudentTransactionNotificationModalProps) {
  const positiveTotal = transactions.reduce(
    (total, transaction) =>
      transaction.amount > 0 ? total + transaction.amount : total,
    0,
  );

  return (
    <ModalShell
      description={`${transactions.length} new account ${transactions.length === 1 ? "entry" : "entries"}`}
      footer={
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDismissing}
          onClick={onDismiss}
          type="button"
        >
          {isDismissing ? "Saving..." : "Got it"}
        </button>
      }
      maxWidthClassName="max-w-lg"
      onClose={isDismissing ? undefined : onDismiss}
      title="Since you were away"
    >
      {positiveTotal > 0 && (
        <div className="positive-surprise-banner mb-4 flex items-center gap-3 overflow-hidden rounded-md border border-success-border bg-success-soft px-4 py-3">
          <span className="positive-surprise-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-success">
            <SparkleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-success">
              New credits landed
            </p>
            <p className="font-number mt-1 text-2xl font-semibold leading-none text-success">
              +{formatCurrencyAmount(positiveTotal, currencyName)}
            </p>
          </div>
        </div>
      )}
      <div className="divide-y divide-border-subtle">
        {transactions.map((transaction) => (
          <TransactionNotificationRow
            currencyName={currencyName}
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </div>

      {error && (
        <p
          className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
          role="alert"
        >
          {error}
        </p>
      )}
    </ModalShell>
  );
}

function TransactionNotificationRow({
  currencyName,
  transaction,
}: {
  currencyName: string;
  transaction: UnseenTransaction;
}) {
  const isPositive = transaction.amount > 0;
  const DirectionIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <article className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isPositive
            ? "bg-success-soft text-success"
            : "bg-danger-soft text-danger-strong"
        }`}
      >
        <DirectionIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {transaction.reason}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatDateTime(transaction.createdAt)}
        </p>
      </div>
      <p
        className={`font-number shrink-0 text-base font-semibold ${getSignedAmountTextClassName(transaction.amount)}`}
      >
        {formatSignedCurrencyAmount(transaction.amount, currencyName)}
      </p>
    </article>
  );
}
