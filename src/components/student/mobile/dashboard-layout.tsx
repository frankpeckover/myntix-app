"use client";

import type { ReactNode } from "react";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { MobileDisclosure } from "@/components/layout/mobile/disclosure";
import { StudentGoalCard } from "@/components/student/goal-card";
import { StudentRecentActivity } from "@/components/student/shared/recent-activity";
import { StudentShopRequestsPanel } from "@/components/rewards/student-shop-requests-panel";
import { ShoppingCartIcon, TargetIcon, TrophyIcon } from "@/components/ui/icons";

export function MobileStudentDashboard({ balance, currencyName, isLoading,
  onBrowseRewards, onOpenTransactionHistory, transactions, wallet,
}: {
  balance: number;
  currencyName: string;
  isLoading: boolean;
  onBrowseRewards: () => void;
  onOpenTransactionHistory: () => void;
  transactions: TransactionLogItem[];
  wallet: ReactNode;
}) {
  return (
    <div className="space-y-3 pt-2" data-dashboard-layout="mobile-student">
      {wallet}
      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-[color:var(--brand-foreground)] transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={onBrowseRewards}
        type="button"
      >
        <TrophyIcon className="h-5 w-5" />
        Browse rewards
      </button>
      <StudentRecentActivity compact currencyName={currencyName} isLoading={isLoading}
        limit={3} onOpenTransactionHistory={onOpenTransactionHistory} transactions={transactions} />
      <MobileDisclosure icon={<TargetIcon className="h-4 w-4" />} title="Savings goal">
        <StudentGoalCard balance={balance} currencyName={currencyName} />
      </MobileDisclosure>
      <MobileDisclosure icon={<ShoppingCartIcon className="h-4 w-4" />} title="My cart">
        <StudentShopRequestsPanel onBrowseRewards={onBrowseRewards} />
      </MobileDisclosure>
    </div>
  );
}
