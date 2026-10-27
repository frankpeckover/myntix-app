"use client";

import type { ReactNode } from "react";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { StudentGoalCard } from "@/components/student/goal-card";
import { StudentShopRequestsPanel } from "@/components/rewards/student-shop-requests-panel";
import { TrophyIcon } from "@/components/ui/icons";
import { StudentRecentActivity } from "@/components/student/shared/recent-activity";

type SimpleStudentDashboardProps = {
  balance: number;
  currencyName: string;
  isLoading: boolean;
  onBrowseRewards: () => void;
  onOpenTransactionHistory: () => void;
  transactions: TransactionLogItem[];
  wallet: ReactNode;
};

export function SimpleStudentDashboard({
  balance,
  currencyName,
  isLoading,
  onBrowseRewards,
  onOpenTransactionHistory,
  transactions,
  wallet,
}: SimpleStudentDashboardProps) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex justify-end">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-[color:var(--brand-foreground)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-safe:active:scale-[0.98]"
          onClick={onBrowseRewards}
          type="button"
        >
          <TrophyIcon className="h-5 w-5" />
          Explore rewards
        </button>
      </div>
      <section
        className="student-dashboard-section dashboard-grid motion-panel"
        aria-label="Your credits and savings"
      >
        {wallet}
        <StudentGoalCard
          balance={balance}
          className="dashboard-unit-2 dashboard-height-4"
          currencyName={currencyName}
        />
      </section>
      <section
        className="student-dashboard-section dashboard-grid"
        aria-label="Your activity and cart"
      >
        <StudentRecentActivity
          className="dashboard-unit-2"
          currencyName={currencyName}
          isLoading={isLoading}
          onOpenTransactionHistory={onOpenTransactionHistory}
          transactions={transactions}
        />
        <StudentShopRequestsPanel
          className="dashboard-unit-2"
          onBrowseRewards={onBrowseRewards}
        />
      </section>
    </div>
  );
}
