"use client";

import { PageResultCount } from "@/components/ui/page-result-count";

import { MobileTableToolbar } from "@/components/ui/mobile-table-toolbar";

import { MobileListRow } from "@/components/ui/mobile-list-row";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  exportTransactionLog,
  listTransactionLogPage,
  voidTransaction,
} from "@/lib/actions";
import { downloadCsv } from "@/lib/csv/client";
import {
  canViewAllTransactions,
  canVoidTransactions,
} from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type {
  TransactionLogItem,
  TransactionLogSort,
} from "@/domains/ledger/transaction-service";
import { getSignedAmountTextClassName } from "@/lib/presentation/amount-style";
import {
  formatDateTime,
  formatSignedAmount,
} from "@/lib/presentation/formatters";
import { TransactionDetailsModal } from "@/components/transactions/transaction-details-modal";
import {
  emptyTransactionFilters,
  type TransactionFilters,
} from "@/components/transactions/transaction-log-types";
import { TransactionStatusBadge } from "@/components/transactions/transaction-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/ui/data-table";
import { LoadFailure } from "@/components/ui/load-failure";
import {
  EyeIcon,
  FileDownIcon,
  FilterIcon,
  ListIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  useResponsiveListPageSize,
} from "@/components/ui/list-pagination";
import {
  TableActionMenu,
  type TableActionMenuItem,
} from "@/components/ui/table-action-menu";
import { TableActionGrid } from "@/components/ui/table-action-grid";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TextReasonModal } from "@/components/ui/text-reason-modal";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ledgerChangeEventName } from "@/lib/ledger/ledger-change-event";
import type { TableSortDirection } from "@/components/ui/table-sorting";

type TransactionLogPanelProps = {
  className?: string;
  currencyName: string;
  currentUser: SessionUser;
  initialDateFilter?: string;
  onViewAll?: () => void;
  previewLimit?: number;
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
  { label: "Archive reversal", value: "void_reversal" },
];

const voidedStatusOptions = [
  { label: "All", value: "" },
  { label: "Archived", value: "voided" },
  { label: "Active", value: "active" },
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
  className = "",
  currencyName,
  currentUser,
  initialDateFilter,
  onViewAll,
  previewLimit,
}: TransactionLogPanelProps) {
  const canViewAllTransactionsForUser = canViewAllTransactions(currentUser);
  const canVoidTransactionsForUser = canVoidTransactions(currentUser);
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasAnyTransactions, setHasAnyTransactions] = useState(false);
  const [page, setPage] = useState(1);
  const { pageSize, setPageSize } = useResponsiveListPageSize();
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    ...emptyTransactionFilters,
    createdDate: typeof initialDateFilter === "string" && getLocalDateRange(initialDateFilter).createdAtFrom
      ? initialDateFilter
      : "",
  }));
  const [tableSort, setTableSort] = useState<{ column: string; direction: TableSortDirection } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<TransactionLogItem | null>(null);
  const [voidingTransaction, setVoidingTransaction] =
    useState<TransactionLogItem | null>(null);
  const requestSequence = useRef(0);
  const isPreview = previewLimit !== undefined;
  const dateRange = useMemo(
    () => getLocalDateRange(filters.createdDate),
    [filters.createdDate],
  );
  const sort = useMemo<TransactionLogSort>(
    () =>
      tableSort && isTransactionSortColumn(tableSort.column)
        ? { column: tableSort.column, direction: tableSort.direction }
        : null,
    [tableSort],
  );
  const refreshTransactions = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pageSize]);

  useEffect(() => {
    const requestId = ++requestSequence.current;
    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await listTransactionLogPage({
          ...dateRange,
          filters,
          page: isPreview ? 1 : page,
          pageSize: isPreview ? Math.min(previewLimit ?? 1, 100) : pageSize,
          previewLimit: isPreview ? previewLimit : undefined,
          sort,
        });
        if (!isActive || requestId !== requestSequence.current) return;
        setTransactions(result.items);
        setTotalCount(result.totalCount);
        setHasAnyTransactions(result.hasAnyTransactions);
        setPage(result.page);
        setError(null);
        setHasLoaded(true);
      } catch {
        if (isActive && requestId === requestSequence.current) {
          setError("Could not load transactions.");
        }
      } finally {
        if (isActive && requestId === requestSequence.current) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [dateRange, filters, isPreview, page, pageSize, previewLimit, refreshVersion, sort]);

  useEffect(() => {
    function refreshAfterExternalAdjustment() {
      void refreshTransactions();
    }

    window.addEventListener(ledgerChangeEventName, refreshAfterExternalAdjustment);
    return () =>
      window.removeEventListener(
        ledgerChangeEventName,
        refreshAfterExternalAdjustment,
      );
  }, [refreshTransactions]);

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
    setMessage("Transaction archived.");
    refreshTransactions();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const visibleTransactions = transactions;
  const displayedTransactions = transactions;

  function updateFilters(nextFilters: TransactionFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function updateSort(column: string, direction: TableSortDirection | null) {
    setTableSort(direction ? { column, direction } : null);
    setPage(1);
  }

  async function handleExportTransactions() {
    try {
      const exportedTransactions = await exportTransactionLog(filters, sort, dateRange);
      downloadTransactions(exportedTransactions, currencyName);
    } catch {
      setError("Could not export transactions.");
    }
  }

  function clearTransactionFilters() {
    updateFilters(emptyTransactionFilters);
  }

  const transactionEmpty = !isLoading && !error && !hasAnyTransactions;
  const filterEmpty = !isLoading && !error && hasAnyTransactions && totalCount === 0;

  return (
    <section className={`table-list-surface theme-panel motion-panel mt-5 min-w-0 overflow-hidden p-0 ${className}`}>
      <FixedNotification error={error} message={message} />
      <div aria-busy={isLoading}>
        {isLoading && !hasLoaded && (
          <LoadingSkeleton lines={isPreview ? 5 : 7} />
        )}
        {!isLoading && error && !hasLoaded && (
          <LoadFailure
            description="The ledger history is temporarily unavailable."
            onRetry={refreshTransactions}
            title="Could not load transactions"
          />
        )}
        {transactionEmpty && (
          <EmptyState
            description="Transactions will appear here after credits are issued, removed, held, spent, or voided."
            icon={<ListIcon />}
            title="No transactions yet"
          />
        )}
        {hasLoaded && hasAnyTransactions && (
          <>
            {!isPreview && filters.createdDate && (
              <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-2 text-sm md:hidden">
                <span className="min-w-0 truncate text-text-control">
                  {formatTransactionDateFilter(filters.createdDate)}
                </span>
                <button
                  className="shrink-0 font-semibold text-brand underline-offset-2 hover:underline"
                  onClick={() => updateFilters({ ...filters, createdDate: "" })}
                  type="button"
                >
                  Clear date
                </button>
              </div>
            )}
            <TransactionList
              canViewAllTransactions={canViewAllTransactionsForUser}
              canVoidTransactions={canVoidTransactionsForUser}
              filters={filters}
              isPreview={isPreview}
              onDetailsClick={setViewingTransaction}
              onFiltersChange={updateFilters}
              onSortChange={updateSort}
              onVoidClick={setVoidingTransaction}
              tableSort={tableSort}
              toolbar={
                <TableToolbar
                  actions={
                    isPreview && onViewAll ? (
                      <button
                        aria-label="View all transactions"
                        className="rounded-sm px-1 py-1 text-sm font-semibold text-brand underline decoration-brand/50 underline-offset-4 transition hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                        onClick={() => onViewAll()}
                        type="button"
                      >
                        View all
                      </button>
                    ) : (
                      <TableActionMenu
                        label="Open transaction log tools"
                        items={[
                          {
                            disabled: isLoading || totalCount === 0,
                            icon: <FileDownIcon />,
                            label: "Export transactions: CSV",
                            onSelect: () => void handleExportTransactions(),
                          },
                        ]}
                      />
                    )
                  }
                >
                  <PageResultCount>
                    {isPreview
                      ? `Latest ${displayedTransactions.length} transactions`
                      : `Showing ${visibleTransactions.length} of ${totalCount} transactions.`}
                  </PageResultCount>
                  <span className="sr-only" role="status">
                    {isLoading ? "Updating transactions." : ""}
                  </span>
                </TableToolbar>
              }
              transactions={displayedTransactions}
            />
            {!isPreview && filterEmpty && (
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
            {!isPreview && totalCount > 0 && (
              <ListPagination
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>

      {voidingTransaction && (
        <TextReasonModal
          confirmLabel="Archive Transaction"
          description="Archiving keeps the original entry and adds a reversal where needed."
          isRequired
          onCancel={() => setVoidingTransaction(null)}
          onConfirm={handleVoidTransaction}
          title="Archive Transaction"
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

function formatTransactionDateFilter(dateValue: string) {
  const { createdAtFrom } = getLocalDateRange(dateValue);
  if (!createdAtFrom) return "All transactions";
  const date = new Date(createdAtFrom);
  return `Transactions for ${new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

function getLocalDateRange(dateValue: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return { createdAtFrom: undefined, createdAtTo: undefined };

  const [, year, month, day] = match;
  const start = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    start.getFullYear() !== Number(year) ||
    start.getMonth() !== Number(month) - 1 ||
    start.getDate() !== Number(day)
  ) {
    return { createdAtFrom: undefined, createdAtTo: undefined };
  }
  const end = new Date(Number(year), Number(month) - 1, Number(day) + 1);

  return {
    createdAtFrom: start.toISOString(),
    createdAtTo: end.toISOString(),
  };
}

function isTransactionSortColumn(
  value: string,
): value is NonNullable<TransactionLogSort>["column"] {
  return ["description", "account", "type", "time", "status", "amount"].includes(value);
}

function TransactionList({
  canViewAllTransactions,
  canVoidTransactions,
  filters,
  isPreview,
  onDetailsClick,
  onFiltersChange,
  onSortChange,
  onVoidClick,
  toolbar,
  tableSort,
  transactions,
}: {
  canViewAllTransactions: boolean;
  canVoidTransactions: boolean;
  filters: TransactionFilters;
  isPreview: boolean;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onFiltersChange: (filters: TransactionFilters) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  toolbar?: ReactNode;
  transactions: TransactionLogItem[];
  tableSort: { column: string; direction: TableSortDirection } | null;
}) {
  function updateFilter<Field extends keyof TransactionFilters>(
    field: Field,
    value: TransactionFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  const tableHeader = (
    <thead>
      <tr className="border-b border-border-subtle text-text-muted">
        {!isPreview && <th scope="col" className="py-2 pr-4 font-semibold">
          {isPreview ? "Description" : <TableHeaderFilter
            isActive={Boolean(filters.reason)}
            label="Description"
            onClear={() => updateFilter("reason", "")}
            onSortDirectionChange={(direction) => onSortChange("description", direction)}
            sortDirection={tableSort?.column === "description" ? tableSort.direction : null}
          >
            <TableHeaderFilterInput
              label="Reason"
              onChange={(value) => updateFilter("reason", value)}
              value={filters.reason}
            />
          </TableHeaderFilter>}
        </th>}
        {canViewAllTransactions && (
          <th scope="col" className="py-2 pr-4 font-semibold">
            {isPreview ? "Account" : <TableHeaderFilter
              isActive={Boolean(filters.student)}
              label="Account"
              onClear={() => updateFilter("student", "")}
              onSortDirectionChange={(direction) => onSortChange("account", direction)}
              sortDirection={tableSort?.column === "account" ? tableSort.direction : null}
            >
              <TableHeaderFilterInput
                label="Student"
                onChange={(value) => updateFilter("student", value)}
                value={filters.student}
              />
            </TableHeaderFilter>}
          </th>
        )}
        <th scope="col" className="py-2 pr-4 font-semibold">
          {isPreview ? "Type" : <TableHeaderFilter
            isActive={Boolean(filters.type)}
            label="Type"
            onClear={() => updateFilter("type", "")}
            onSortDirectionChange={(direction) => onSortChange("type", direction)}
            sortDirection={tableSort?.column === "type" ? tableSort.direction : null}
          >
            <TableHeaderFilterSelect
              label="Type"
              onChange={(value) =>
                updateFilter("type", value as TransactionFilters["type"])
              }
              options={transactionTypeOptions}
              value={filters.type}
            />
          </TableHeaderFilter>}
        </th>
        <th scope="col" className="py-2 pr-4 font-semibold">
          {isPreview ? "Time" : <TableHeaderFilter
            isActive={Boolean(filters.createdDate)}
            label="Time"
            onClear={() => updateFilter("createdDate", "")}
            onSortDirectionChange={(direction) => onSortChange("time", direction)}
            sortDirection={tableSort?.column === "time" ? tableSort.direction : null}
          >
            <TableHeaderFilterInput
              label="Date"
              onChange={(value) => updateFilter("createdDate", value)}
              type="date"
              value={filters.createdDate}
            />
          </TableHeaderFilter>}
        </th>
        <th scope="col" className="py-2 pr-4 font-semibold">
          {isPreview ? "Status" : <TableHeaderFilter
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
            onSortDirectionChange={(direction) => onSortChange("status", direction)}
            sortDirection={tableSort?.column === "status" ? tableSort.direction : null}
          >
            <div className="grid gap-3">
              <TableHeaderFilterSelect
                label="Archive status"
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
          </TableHeaderFilter>}
        </th>
        <th scope="col" className="py-2 pr-4 text-right font-semibold">
          {isPreview ? "Amount" : <TableHeaderFilter
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
            onSortDirectionChange={(direction) => onSortChange("amount", direction)}
            sortDirection={tableSort?.column === "amount" ? tableSort.direction : null}
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
          </TableHeaderFilter>}
        </th>
        {!isPreview && <th scope="col" className="py-2 text-right font-semibold">
          <span className="sr-only">Actions</span>
        </th>}
      </tr>
    </thead>
  );

  return (
    <>
      <MobileTableToolbar label="Transactions" toolbar={toolbar} header={tableHeader} />
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
        <DataTable
          ariaLabel="Transaction log"
          className="transaction-log-table min-w-0"
          toolbar={toolbar}
        >
          <TransactionTableColumnGroup
            canViewAllTransactions={canViewAllTransactions}
            isPreview={isPreview}
          />
          {tableHeader}
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
                {!isPreview && <td className="py-2 pr-4 text-text-muted">
                  {formatTransactionType(transaction.type)}
                </td>}
                <td className="py-2 pr-4 text-text-muted">
                  {formatDateTime(transaction.createdAt)}
                </td>
                <td className="py-2 pr-4">
                  <TransactionStatusBadge transaction={transaction} />
                </td>
                <td className="py-2 pr-4 text-right">
                  <TransactionAmount amount={transaction.amount} />
                </td>
                {!isPreview && <td className="py-2 text-right">
                  <TransactionActions
                    canVoidTransactions={canVoidTransactions}
                    onDetailsClick={onDetailsClick}
                    onVoidClick={onVoidClick}
                    transaction={transaction}
                  />
                </td>}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}

function TransactionTableColumnGroup({
  canViewAllTransactions,
  isPreview,
}: {
  canViewAllTransactions: boolean;
  isPreview: boolean;
}) {
  if (isPreview) {
    return (
      <colgroup>
        <col className="w-[44%]" />
        <col className="w-[22%]" />
        <col className="w-[18%]" />
        <col className="w-[16%]" />
      </colgroup>
    );
  }
  if (canViewAllTransactions) {
    return (
      <colgroup>
        <col className="w-[27%]" />
        <col className="w-[16%]" />
        <col className="w-[12%]" />
        <col className="w-[15%]" />
        <col className="w-[13%]" />
        <col className="w-[11%]" />
        <col className="w-24" />
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
      <col className="w-24" />
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
    <MobileListRow
      value={<TransactionAmount amount={transaction.amount} variant="mobile" />}
      actions={<IconButton label="Transaction details" onClick={() => onDetailsClick(transaction)}>
        <EyeIcon />
      </IconButton>}>
      <p className="break-words text-sm font-semibold">{transaction.reason}</p>
      <p className="mt-1 truncate text-xs text-text-muted">{formatDateTime(transaction.createdAt)}</p>
    </MobileListRow>
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
      icon: <TrashIcon />,
      label: "Archive",
      onSelect: () => onVoidClick(transaction),
    });
  }

  return (
    <TableActionGrid
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
      transaction.isVoided ? "Archived" : transaction.entryStatus,
      transaction.amount,
      currencyName,
      transaction.source,
      transaction.reference,
    ]),
  );
}
