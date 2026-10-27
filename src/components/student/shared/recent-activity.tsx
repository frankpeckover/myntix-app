import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { ChevronRightIcon, SparkleIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { PanelTitle } from "@/components/ui/panel-title";
import { formatDateTime, formatSignedAmount, formatSignedCurrencyAmount } from "@/lib/presentation/formatters";

export function StudentRecentActivity({
  className = "",
  compact = false,
  currencyName,
  isLoading,
  limit = 4,
  onOpenTransactionHistory,
  transactions,
}: {
  className?: string;
  compact?: boolean;
  currencyName: string;
  isLoading: boolean;
  limit?: number;
  onOpenTransactionHistory: () => void;
  transactions: TransactionLogItem[];
}) {
  const recent = transactions
    .filter((transaction) => transaction.entryStatus === "posted" && !transaction.isVoided)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);

  return (
    <article className={`student-dashboard-card rounded-2xl bg-surface p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SparkleIcon className="h-5 w-5 text-brand" />
          <PanelTitle title="My recent activity" />
        </div>
        {compact ? <IconButton label="View all transactions" size="touch" onClick={onOpenTransactionHistory}>
          <ChevronRightIcon className="h-5 w-5" />
        </IconButton> : <button
          className="text-sm font-medium text-brand underline underline-offset-4 hover:opacity-75"
          onClick={onOpenTransactionHistory}
          type="button"
        >
          View all
        </button>}
      </div>
      {isLoading ? (
        <p className="py-6 text-sm text-text-muted" role="status">Loading your activity...</p>
      ) : recent.length === 0 ? (
        <p className="py-6 text-sm text-text-muted">Your first credit update will appear here.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {recent.map((transaction) => (
            <li key={transaction.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-text-control">
                  {transaction.reason || transaction.description}
                </p>
                <time className="mt-1 block text-xs text-text-muted" dateTime={transaction.createdAt}>
                  {formatDateTime(transaction.createdAt)}
                </time>
              </div>
              <span className={`${compact ? "w-24 shrink-0" : "max-w-[45%]"} break-words rounded-md px-2 py-1 text-right text-sm font-semibold ${transaction.amount >= 0 ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}>
                {compact ? <>
                  <span className="block">{formatSignedAmount(transaction.amount)}</span>
                  <span className="block text-xs font-normal">{currencyName}</span>
                </> : formatSignedCurrencyAmount(transaction.amount, currencyName)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
