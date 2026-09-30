"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { CreditActionControl } from "@/components/ui/credit-action-control";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatAmount } from "@/lib/presentation/formatters";

export type StudentBalanceCardStudent = {
  balance: number;
  displayName: string;
  id: string;
  profileImageUrl?: string;
  recentChange?: number;
  username: string;
};

type StudentBalanceCardProps = {
  currencyName: string;
  isQuickActionPending?: boolean;
  onAdjust?: (student: StudentBalanceCardStudent) => void;
  onQuickAdd?: (student: StudentBalanceCardStudent) => void;
  onQuickRemove?: (student: StudentBalanceCardStudent) => void;
  quickAddAmount?: number;
  quickRemoveAmount?: number;
  student: StudentBalanceCardStudent;
};

export function StudentBalanceCard({
  currencyName,
  isQuickActionPending = false,
  onAdjust,
  onQuickAdd,
  onQuickRemove,
  quickAddAmount,
  quickRemoveAmount,
  student,
}: StudentBalanceCardProps) {
  const hasActions = Boolean(onAdjust || onQuickAdd || onQuickRemove);

  return (
    <article className="theme-card min-w-0 p-2.5 sm:p-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <UserAvatar
          displayName={student.displayName}
          imageUrl={student.profileImageUrl}
          size="md"
          tone="neutral"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {student.displayName}
          </h3>
          <p className="truncate text-xs text-text-muted">@{student.username}</p>
          <RecentTrend amount={student.recentChange ?? 0} />
        </div>
      </div>

      <div className="mt-3">
        <BalanceAmount
          amount={student.balance}
          currencyName={currencyName}
        />

        {hasActions && (
          <div className="mt-3 flex items-center gap-2">
            {onAdjust && (
              <button
                aria-label={`Custom adjustment for ${student.displayName}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-button-border bg-surface px-0 text-xs font-semibold text-text-control transition hover:bg-panel-soft sm:w-auto sm:min-w-0 sm:flex-1 sm:px-3"
                onClick={() => onAdjust(student)}
                title={`Custom adjustment for ${student.displayName}`}
                type="button"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Custom</span>
              </button>
            )}
            {(onQuickAdd || onQuickRemove) && (
              <CreditActionControl
                addAriaLabel={`Quick add ${quickAddAmount ?? "credits"} to ${student.displayName}`}
                addLabel={quickAddAmount ? formatAmount(quickAddAmount) : "Add"}
                amountLabels
                onAdd={
                  onQuickAdd && !isQuickActionPending
                    ? () => onQuickAdd(student)
                    : undefined
                }
                onRemove={
                  onQuickRemove && !isQuickActionPending
                    ? () => onQuickRemove(student)
                    : undefined
                }
                removeAriaLabel={`Quick remove ${quickRemoveAmount ?? "credits"} from ${student.displayName}`}
                removeLabel={
                  quickRemoveAmount
                    ? formatAmount(quickRemoveAmount)
                    : "Remove"
                }
              />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function RecentTrend({ amount }: { amount: number }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const Icon = isPositive ? ArrowUpIcon : isNegative ? ArrowDownIcon : MinusIcon;
  const textClassName = isPositive
    ? "text-success"
    : isNegative
      ? "text-danger"
      : "text-text-muted";
  const trendLabel = isPositive
    ? "Trending up over the last 7 days"
    : isNegative
      ? "Trending down over the last 7 days"
      : "No recent movement over the last 7 days";

  return (
    <p
      className={`mt-0.5 flex items-center gap-1 truncate text-xs font-medium ${textClassName}`}
      title={trendLabel}
    >
      <span className="text-text-muted">Recent:</span>
      <Icon className="h-3 w-3 shrink-0" />
    </p>
  );
}

function BalanceAmount({
  amount,
  currencyName,
}: {
  amount: number;
  currencyName: string;
}) {
  return (
    <p className="flex min-w-0 flex-col text-left text-brand">
      <span className="font-number text-2xl font-semibold leading-none">
        {formatAmount(amount)}
      </span>
      <span className="mt-0.5 text-xs font-semibold text-text-muted">
        {currencyName}
      </span>
    </p>
  );
}
