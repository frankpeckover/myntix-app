"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
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
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div className="flex-1 p-3 sm:p-4">
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
        </div>
      </div>

      {hasActions && (
        <footer className="mt-auto">
          {(onQuickAdd || onQuickRemove || onAdjust) && (
            <CreditActionControl
                addAriaLabel={`Quick add ${quickAddAmount ?? "credits"} to ${student.displayName}`}
                addLabel={quickAddAmount ? formatAmount(quickAddAmount) : "Add"}
                adjustAriaLabel={`Adjust credits for ${student.displayName}`}
                amountLabels
                flush
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
                onAdjust={onAdjust ? () => onAdjust(student) : undefined}
                removeAriaLabel={`Quick remove ${quickRemoveAmount ?? "credits"} from ${student.displayName}`}
                removeLabel={
                  quickRemoveAmount
                    ? formatAmount(quickRemoveAmount)
                    : "Remove"
                }
                solid
            />
          )}
        </footer>
      )}
    </article>
  );
}

function RecentTrend({ amount }: { amount: number }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const Icon = isPositive ? ArrowUpIcon : isNegative ? ArrowDownIcon : MinusIcon;
  const toneClassName = isPositive
    ? "bg-[#E8F5EE] text-[#166534]"
    : isNegative
      ? "bg-[#FEECEC] text-[#991B1B]"
      : "bg-panel-soft text-text-muted";
  const trendLabel = isPositive
    ? `+${formatAmount(amount)} over the last 7 days`
    : isNegative
      ? `-${formatAmount(Math.abs(amount))} over the last 7 days`
      : "No movement over the last 7 days";

  return (
    <p
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${toneClassName}`}
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
