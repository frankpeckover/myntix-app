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
    <article className="group min-w-0 rounded-xl border border-border-subtle bg-surface p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md sm:p-4">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
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
        </div>
        <RecentTrend amount={student.recentChange ?? 0} />
      </div>

      <div className="mt-4">
        <BalanceAmount
          amount={student.balance}
          currencyName={currencyName}
        />

        {hasActions && (
          <div className="mt-4 space-y-2">
            {(onQuickAdd || onQuickRemove) && (
              <CreditActionControl
                addAriaLabel={`Quick add ${quickAddAmount ?? "credits"} to ${student.displayName}`}
                addLabel={quickAddAmount ? formatAmount(quickAddAmount) : "Add"}
                amountLabels
                fullWidth
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
                solid
              />
            )}
            {onAdjust && (
              <button
                aria-label={`Adjust credits for ${student.displayName}`}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-button-border bg-surface px-3 text-xs font-semibold text-text-control transition hover:border-border-strong hover:bg-panel-soft"
                onClick={() => onAdjust(student)}
                title={`Adjust credits for ${student.displayName}`}
                type="button"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                <span>Adjust credits</span>
              </button>
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
    ? `+${formatAmount(amount)} over the last 7 days`
    : isNegative
      ? `-${formatAmount(Math.abs(amount))} over the last 7 days`
      : "No movement over the last 7 days";

  return (
    <p
      className={`flex shrink-0 items-center gap-1 rounded-full bg-panel-soft px-2 py-1 text-[11px] font-semibold ${textClassName}`}
      title={trendLabel}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{isPositive ? `+${formatAmount(amount)}` : isNegative ? `-${formatAmount(Math.abs(amount))}` : "0"}</span>
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
    <p className="flex min-w-0 flex-col text-left text-foreground">
      <span className="font-number text-3xl font-semibold leading-none">
        {formatAmount(amount)}
      </span>
      <span className="mt-0.5 text-xs font-semibold text-text-muted">
        {currencyName}
      </span>
    </p>
  );
}
