"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listTransactionLog, voidTransaction } from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import {
  canViewAllTransactions,
  canVoidTransactions,
} from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/domains/ledger/transaction-service";
import { getSignedAmountTextClassName } from "@/lib/amount-style";
import {
  formatDateTime,
  formatSignedAmount,
} from "@/lib/formatters";
import { matchesTransactionFilters } from "@/components/transactions/transaction-filter-utils";
import { TransactionDetailsModal } from "@/components/transactions/transaction-details-modal";
import {
  emptyTransactionFilters,
  type TransactionFilters,
} from "@/components/transactions/transaction-log-types";
import { TransactionStatusBadge } from "@/components/transactions/transaction-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import {
  EyeIcon,
  FileDownIcon,
  FilterIcon,
  ListIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import {
  TableActionMenu,
  type TableActionMenuItem,
} from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type TransactionLogPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  title?: string;
};

const transactionTypeOptions = [
  { label: "Any type", value: "" },
  { label: "Reward", value: "reward" },
  { label: "Penalty", value: "penalty" },
  { label: "Credit", value: "credit" },
  { label: "Debit", value: "debit" },
  { label: "Hold", value: "hold" },
  { label: "Reward hold", value: "shop_hold" },
  { label: "Reward redemption", value: "shop_purchase" },
  { label: "Reward refund", value: "shop_refund" },
  { label: "Manual adjustment", value: "manual_adjustment" },
  { label: "Void reversal", value: "void_reversal" },
];

const voidedStatusOptions = [
  { label: "Any status", value: "" },
  { label: "Active", value: "active" },
  { label: "Voided", value: "voided" },
];

const purchaseStatusOptions = [
  { label: "Any reward status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
];

const amountDirectionOptions = [
  { label: "Any amount", value: "" },
  { label: "Added", value: "positive" },
  { label: "Removed/spent", value: "negative" },
];

export function TransactionLogPanel({
  currencyName,
  currentUser,
}: TransactionLogPanelProps) {
  const canViewAllTransactionsForUser = canViewAllTransactions(currentUser);
  const canVoidTransactionsForUser = canVoidTransactions(currentUser);
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(
    emptyTransactionFilters,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<TransactionLogItem | null>(null);
  const [voidingTransaction, setVoidingTransaction] =
    useState<TransactionLogItem | null>(null);

  async function refreshTransactions() {
    setIsLoading(true);

    try {
      const loadedTransactions = await listTransactionLog();
      setTransactions(loadedTransactions);
      setError(null);
    } catch {
      setError("Could not load transactions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const loadedTransactions = await listTransactionLog();

        if (isMounted) {
          setTransactions(loadedTransactions);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load transactions.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleVoidTransaction(reason: string) {
    if (!voidingTransaction) {
      return;
    }
    setError(null);
    setMessage(null);

    const result = await voidTransaction(voidingTransaction.id, reason);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setVoidingTransaction(null);
    setMessage("Transaction voided.");
    refreshTransactions();
  }

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        matchesTransactionFilters(transaction, filters),
      ),
    [filters, transactions],
  );
  const {
    page,
    pageItems: visibleTransactions,
    setPage,
    totalPages,
  } = usePagedList(filteredTransactions);

  function clearTransactionFilters() {
    setFilters(emptyTransactionFilters);
  }

  return (
    <section className="theme-panel motion-panel mt-5 min-w-0 p-0">
      <FixedNotification error={error} message={message} />
      <div>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading transactions...</p>
        )}
        {!isLoading && error && transactions.length === 0 && (
          <LoadFailure
            description="The ledger history is temporarily unavailable."
            onRetry={refreshTransactions}
            title="Could not load transactions"
          />
        )}
        {!isLoading && !error && transactions.length === 0 && (
          <EmptyState
            description="Transactions will appear here after credits are issued, removed, held, spent, or voided."
            icon={<ListIcon />}
            title="No transactions yet"
          />
        )}
        {!isLoading && transactions.length > 0 && (
          <>
            <TransactionList
              canViewAllTransactions={canViewAllTransactionsForUser}
              canVoidTransactions={canVoidTransactionsForUser}
              filters={filters}
              onDetailsClick={setViewingTransaction}
              onFiltersChange={setFilters}
              onVoidClick={setVoidingTransaction}
              toolbar={
                <TableToolbar
                  actions={
                    <TableActionMenu
                      label="Open transaction log tools"
                      items={[
                        {
                          disabled:
                            isLoading || filteredTransactions.length === 0,
                          icon: <FileDownIcon />,
                          label: "Export transactions: CSV",
                          onSelect: () =>
                            downloadTransactions(
                              filteredTransactions,
                              currencyName,
                            ),
                        },
                      ]}
                    />
                  }
                >
                  <p className="text-sm font-semibold text-text-muted">
                    Showing {visibleTransactions.length} of {filteredTransactions.length} transactions.
                  </p>
                </TableToolbar>
              }
              transactions={visibleTransactions}
            />
            {filteredTransactions.length === 0 && (
              <EmptyState
                action={
                  <IconButton
                    label="Clear transaction filters"
                    onClick={clearTransactionFilters}
                    text="Clear Filters"
                  >
                    <XIcon />
                  </IconButton>
                }
                description="Try changing or clearing the filters to see more ledger activity."
                icon={<FilterIcon />}
                title="No matching transactions"
              />
            )}
            {filteredTransactions.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                page={page}
                totalCount={filteredTransactions.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>

      {voidingTransaction && (
        <TextReasonModal
          confirmLabel="Void Transaction"
          description="Voiding keeps the original entry and adds a reversal where needed."
          isRequired
          onCancel={() => setVoidingTransaction(null)}
          onConfirm={handleVoidTransaction}
          title="Void Transaction"
        />
      )}

      {viewingTransaction && (
        <TransactionDetailsModal
          currencyName={currencyName}
          onClose={() => setViewingTransaction(null)}
          transaction={viewingTransaction}
        />
      )}
    </section>
  );
}

function TransactionList({
  canViewAllTransactions,
  canVoidTransactions,
  filters,
  onDetailsClick,
  onFiltersChange,
  onVoidClick,
  toolbar,
  transactions,
}: {
  canViewAllTransactions: boolean;
  canVoidTransactions: boolean;
  filters: TransactionFilters;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onFiltersChange: (filters: TransactionFilters) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  toolbar?: ReactNode;
  transactions: TransactionLogItem[];
}) {
  function updateFilter<Field extends keyof TransactionFilters>(
    field: Field,
    value: TransactionFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid w-full min-w-0 gap-2 md:hidden">
        {transactions.map((transaction) => (
          <TransactionMobileRow
            key={transaction.id}
            onDetailsClick={onDetailsClick}
            transaction={transaction}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-visible md:block">
        {toolbar}
        <table aria-label="Transaction log" className="transaction-log-table w-full min-w-0 table-fixed border-collapse text-left text-sm">
          <TransactionTableColumnGroup
            canViewAllTransactions={canViewAllTransactions}
          />
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.reason)}
                  label="Description"
                  onClear={() => updateFilter("reason", "")}
                >
                  <TableHeaderFilterInput
                    label="Reason"
                    onChange={(value) => updateFilter("reason", value)}
                    value={filters.reason}
                  />
                </TableHeaderFilter>
              </th>
              {canViewAllTransactions && (
                <th scope="col" className="py-2 pr-4 font-semibold">
                  <TableHeaderFilter
                    isActive={Boolean(filters.student)}
                    label="Account"
                    onClear={() => updateFilter("student", "")}
                  >
                    <TableHeaderFilterInput
                      label="Student"
                      onChange={(value) => updateFilter("student", value)}
                      value={filters.student}
                    />
                  </TableHeaderFilter>
                </th>
              )}
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.type)}
                  label="Type"
                  onClear={() => updateFilter("type", "")}
                >
                  <TableHeaderFilterSelect
                    label="Type"
                    onChange={(value) =>
                      updateFilter("type", value as TransactionFilters["type"])
                    }
                    options={transactionTypeOptions}
                    value={filters.type}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">Time</th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(
                    filters.purchaseStatus || filters.voidedStatus !== "active",
                  )}
                  label="Status"
                  onClear={() =>
                    onFiltersChange({
                      ...filters,
                      purchaseStatus: "",
                      voidedStatus: "active",
                    })
                  }
                >
                  <div className="grid gap-3">
                    <TableHeaderFilterSelect
                      label="Void status"
                      onChange={(value) =>
                        updateFilter(
                          "voidedStatus",
                          value as TransactionFilters["voidedStatus"],
                        )
                      }
                      options={voidedStatusOptions}
                      value={filters.voidedStatus}
                    />
                    <TableHeaderFilterSelect
                      label="Reward status"
                      onChange={(value) =>
                        updateFilter(
                          "purchaseStatus",
                          value as TransactionFilters["purchaseStatus"],
                        )
                      }
                      options={purchaseStatusOptions}
                      value={filters.purchaseStatus}
                    />
                  </div>
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(
                    filters.amountDirection ||
                      filters.amountMin ||
                      filters.amountMax,
                  )}
                  label="Amount"
                  onClear={() =>
                    onFiltersChange({
                      ...filters,
                      amountDirection: "",
                      amountMax: "",
                      amountMin: "",
                    })
                  }
                >
                  <div className="grid gap-3">
                    <TableHeaderFilterSelect
                      label="Direction"
                      onChange={(value) =>
                        updateFilter(
                          "amountDirection",
                          value as TransactionFilters["amountDirection"],
                        )
                      }
                      options={amountDirectionOptions}
                      value={filters.amountDirection}
                    />
                    <TableHeaderFilterInput
                      label="Minimum"
                      onChange={(value) => updateFilter("amountMin", value)}
                      type="number"
                      value={filters.amountMin}
                    />
                    <TableHeaderFilterInput
                      label="Maximum"
                      onChange={(value) => updateFilter("amountMax", value)}
                      type="number"
                      value={filters.amountMax}
                    />
                  </div>
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr className="border-b border-border-subtle" key={transaction.id}>
                <td className="break-words py-2 pr-4">
                  <span className="font-semibold">{transaction.reason}</span>
                  <span className="mt-1 block text-xs text-text-subtle">
                    {transaction.description}
                  </span>
                </td>
                {canViewAllTransactions && (
                  <td className="py-2 pr-4 text-text-muted">
                    {transaction.studentName}
                    <span className="block text-xs">
                      {transaction.studentUsername}
                    </span>
                  </td>
                )}
                <td className="py-2 pr-4 text-text-muted">
                  {formatTransactionType(transaction.type)}
                </td>
                <td className="py-2 pr-4 text-text-muted">
                  {formatDateTime(transaction.createdAt)}
                </td>
                <td className="py-2 pr-4">
                  <TransactionStatusBadge transaction={transaction} />
                </td>
                <td className="py-2 pr-4 text-right">
                  <TransactionAmount amount={transaction.amount} />
                </td>
                <td className="py-2 text-right">
                  <TransactionActions
                    canVoidTransactions={canVoidTransactions}
                    onDetailsClick={onDetailsClick}
                    onVoidClick={onVoidClick}
                    transaction={transaction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionTableColumnGroup({
  canViewAllTransactions,
}: {
  canViewAllTransactions: boolean;
}) {
  if (canViewAllTransactions) {
    return (
      <colgroup>
        <col className="w-[27%]" />
        <col className="w-[16%]" />
        <col className="w-[12%]" />
        <col className="w-[15%]" />
        <col className="w-[13%]" />
        <col className="w-[11%]" />
        <col className="w-[6%]" />
      </colgroup>
    );
  }

  return (
      <colgroup>
      <col className="w-[37%]" />
      <col className="w-[15%]" />
      <col className="w-[18%]" />
      <col className="w-[14%]" />
      <col className="w-[10%]" />
      <col className="w-[6%]" />
    </colgroup>
  );
}

function formatTransactionType(type: TransactionLogItem["type"]) {
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ??
    type
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function TransactionMobileRow({
  onDetailsClick,
  transaction,
}: {
  onDetailsClick: (transaction: TransactionLogItem) => void;
  transaction: TransactionLogItem;
}) {
  return (
    <article className="theme-card grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 overflow-hidden p-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="break-words text-sm font-semibold">
          {transaction.reason}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(transaction.createdAt)}
        </p>
      </div>
      <TransactionAmount amount={transaction.amount} variant="mobile" />
      <div className="shrink-0">
        <IconButton
          label="Transaction details"
          onClick={() => onDetailsClick(transaction)}
        >
          <EyeIcon />
        </IconButton>
      </div>
    </article>
  );
}

function TransactionAmount({
  amount,
  variant = "desktop",
}: {
  amount: number;
  variant?: "desktop" | "mobile";
}) {
  const layoutClassName =
    variant === "desktop"
      ? "min-w-20 text-right text-base"
      : "min-w-16 text-right text-base";

  return (
    <span
      className={`block font-semibold tabular-nums tracking-normal ${layoutClassName} ${getSignedAmountTextClassName(amount)}`}
    >
      {formatSignedAmount(amount)}
    </span>
  );
}

function TransactionActions({
  canVoidTransactions,
  onDetailsClick,
  onVoidClick,
  transaction,
}: {
  canVoidTransactions: boolean;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  transaction: TransactionLogItem;
}) {
  const actionItems: TableActionMenuItem[] = [
    {
      icon: <EyeIcon />,
      label: "View details",
      onSelect: () => onDetailsClick(transaction),
    },
  ];

  if (canVoidTransactions) {
    actionItems.push({
      disabled: transaction.isVoided || transaction.type === "void_reversal",
      icon: <XIcon />,
      label: "Void",
      onSelect: () => onVoidClick(transaction),
    });
  }

  return (
    <TableActionMenu
      label="Open transaction actions"
      items={actionItems}
    />
  );
}

function downloadTransactions(
  transactions: TransactionLogItem[],
  currencyName: string,
) {
  downloadCsv(
    "transaction-log.csv",
    [
      "date",
      "description",
      "account",
      "username",
      "status",
      "amount",
      "currency",
      "source",
      "reference",
    ],
    transactions.map((transaction) => [
      formatDateTime(transaction.createdAt),
      transaction.reason,
      transaction.studentName,
      transaction.studentUsername,
      transaction.isVoided ? "Voided" : transaction.entryStatus,
      transaction.amount,
      currencyName,
      transaction.source,
      transaction.reference,
    ]),
  );
}
