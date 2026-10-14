"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  approveShopRequest,
  denyShopRequest,
  listStaffShopRequests,
} from "@/lib/actions";
import type { ShopPurchaseRequest } from "@/domains/rewards/shop-service";
import { formatAmount, formatDateTime } from "@/lib/presentation/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ListCount } from "@/components/ui/list-count";
import { CheckIcon, ShoppingCartIcon, XIcon } from "@/components/ui/icons";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TextReasonModal } from "@/components/ui/text-reason-modal";
import {
  DataTable,
  DataTableCurrencyValue,
  DataTableSelectionCell,
  DataTableSelectionHeader,
} from "@/components/ui/data-table";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { sortTableItems, type TableSortDirection } from "@/components/ui/table-sorting";
import { updateSelectedIds } from "@/components/ui/selection-utils";

type ShopRequestTableFilters = {
  decisionNote: string;
  item: string;
  status: "" | ShopPurchaseRequest["status"];
  student: string;
};

const emptyShopRequestTableFilters: ShopRequestTableFilters = {
  decisionNote: "",
  item: "",
  status: "",
  student: "",
};

type ShopRequestsPanelProps = {
  className?: string;
  currencyName: string;
  maxVisibleRequests?: number;
  onRequestActioned?: () => void;
  showViewToggle?: boolean;
};

export function ShopRequestsPanel({
  className = "mt-5",
  currencyName,
  maxVisibleRequests,
  onRequestActioned,
  showViewToggle = true,
}: ShopRequestsPanelProps) {
  const [requests, setRequests] = useState<ShopPurchaseRequest[]>([]);
  const [activeView, setActiveView] = useState<"pending" | "recent">("pending");
  const [denyingRequestIds, setDenyingRequestIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ShopRequestTableFilters>(
    emptyShopRequestTableFilters,
  );
  const [tableSort, setTableSort] = useState<{ column: string; direction: TableSortDirection } | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingBulkApproval, setIsConfirmingBulkApproval] = useState(false);
  const [isApprovingBulkRequests, setIsApprovingBulkRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pendingDecisionIdsRef = useRef(new Set<string>());

  async function refreshRequests() {
    setIsLoading(true);

    try {
      const loadedRequests = await listStaffShopRequests();
      setRequests(loadedRequests);
      setError(null);
    } catch {
      setError("Could not load reward requests.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const loadedRequests = await listStaffShopRequests();

        if (isMounted) {
          setRequests(loadedRequests);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load reward requests.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleApprove(purchaseId: string) {
    if (pendingDecisionIdsRef.current.has(purchaseId)) {
      return;
    }
    if (!navigator.onLine) {
      setError("You are offline. Reconnect before approving a request.");
      return;
    }

    setError(null);
    setMessage(null);
    pendingDecisionIdsRef.current.add(purchaseId);

    let result;

    try {
      result = await approveShopRequest(purchaseId);
    } catch {
      setError("Could not confirm the approval. Refresh before trying again.");
      pendingDecisionIdsRef.current.delete(purchaseId);
      return;
    }
    pendingDecisionIdsRef.current.delete(purchaseId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Request approved.");
    setSelectedRequestIds((current) =>
      updateSelectedIds(current, [purchaseId], false),
    );
    onRequestActioned?.();
    refreshRequests();
  }

  async function handleDeny(decisionNote: string) {
    if (denyingRequestIds.length === 0) {
      return;
    }
    if (!navigator.onLine) {
      setError("You are offline. Reconnect before denying a request.");
      return;
    }
    setError(null);
    setMessage(null);

    let deniedCount = 0;
    for (const purchaseId of denyingRequestIds) {
      if (pendingDecisionIdsRef.current.has(purchaseId)) continue;
      pendingDecisionIdsRef.current.add(purchaseId);
      try {
        const result = await denyShopRequest(purchaseId, decisionNote);
        if (result.ok) deniedCount += 1;
      } catch {
        // Continue so one changed request does not block the rest of the selection.
      } finally {
        pendingDecisionIdsRef.current.delete(purchaseId);
      }
    }

    setDenyingRequestIds([]);
    setSelectedRequestIds([]);
    setIsConfirmingBulkApproval(false);
    setMessage(
      deniedCount === 1 ? "Request denied." : `${deniedCount} requests denied.`,
    );
    onRequestActioned?.();
    refreshRequests();
  }

  async function handleBulkApprove() {
    const requestIds = [...selectedRequestIds];

    if (requestIds.length === 0) {
      setIsConfirmingBulkApproval(false);
      return;
    }
    if (!navigator.onLine) {
      setError("You are offline. Reconnect before approving requests.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsApprovingBulkRequests(true);
    let approvedCount = 0;
    const approvedIds = new Set<string>();

    try {
      for (const purchaseId of requestIds) {
        if (pendingDecisionIdsRef.current.has(purchaseId)) continue;
        pendingDecisionIdsRef.current.add(purchaseId);
        try {
          const result = await approveShopRequest(purchaseId);
          if (result.ok) {
            approvedCount += 1;
            approvedIds.add(purchaseId);
          }
        } catch {
          // Continue so one changed request does not block the rest of the selection.
        } finally {
          pendingDecisionIdsRef.current.delete(purchaseId);
        }
      }

      const failedCount = requestIds.length - approvedCount;
      setSelectedRequestIds((current) =>
        current.filter((requestId) => !approvedIds.has(requestId)),
      );

      if (approvedCount > 0) {
        setMessage(
          approvedCount === 1
            ? "Request approved."
            : `${approvedCount} requests approved.`,
        );
      }

      if (failedCount > 0) {
        setError(
          approvedCount > 0
            ? `${failedCount} request${failedCount === 1 ? "" : "s"} could not be approved and remain selected.`
            : "The selected requests could not be approved. Refresh and try again.",
        );
      }

      onRequestActioned?.();
      setIsConfirmingBulkApproval(false);
      setIsApprovingBulkRequests(false);
      await refreshRequests();
    } catch {
      setError(
        "Could not finish approving the selected requests. Refresh and check their status.",
      );
    } finally {
      setIsConfirmingBulkApproval(false);
      setIsApprovingBulkRequests(false);
    }
  }

  const filteredRequests =
    activeView === "pending"
      ? requests.filter((request) => request.status === "pending")
      : requests.filter((request) => request.status !== "pending");
  const visibleRequests =
    maxVisibleRequests === undefined
      ? filteredRequests
      : filteredRequests.slice(0, maxVisibleRequests);
  const displayedRequests = sortTableItems(
    visibleRequests.filter((request) => matchesShopRequestTableFilters(request, filters)),
    tableSort,
    (request, column) => {
      switch (column) {
        case "item": return request.itemName;
        case "student": return request.studentName;
        case "cost": return request.price;
        case "status": return request.status;
        case "comment": return request.decisionNote;
        default: return "";
      }
    },
  );
  const selectableRequestIds = displayedRequests
    .filter((request) => request.status === "pending")
    .map((request) => request.id);
  const selectedRequestIdSet = new Set(selectedRequestIds);
  const areAllVisibleRequestsSelected =
    selectableRequestIds.length > 0 &&
    selectableRequestIds.every((id) => selectedRequestIdSet.has(id));

  function handleVisibleSelectionChange(isSelected: boolean) {
    setSelectedRequestIds((current) =>
      updateSelectedIds(current, selectableRequestIds, isSelected),
    );
  }

  function handleRequestSelectionChange(requestId: string, isSelected: boolean) {
    setSelectedRequestIds((current) =>
      updateSelectedIds(current, [requestId], isSelected),
    );
  }

  function changeView(view: "pending" | "recent") {
    setActiveView(view);
    setSelectedRequestIds([]);
    if (view === "pending") {
      setFilters((current) => ({ ...current, decisionNote: "" }));
    }
  }

  const tableToolbar = (
    <TableToolbar
      actions={
        showViewToggle ? (
          <div className="flex rounded-md border border-border bg-surface p-1">
            {(["pending", "recent"] as const).map((view) => (
              <button
                className={`rounded-sm px-3 py-1.5 text-sm font-semibold transition ${
                  activeView === view
                    ? "bg-brand text-white"
                    : "text-text-control hover:bg-surface-hover"
                }`}
                key={view}
                onClick={() => changeView(view)}
                type="button"
              >
                {view === "pending" ? "Pending" : "Recent"}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ListCount
          count={displayedRequests.length}
          label="rewards"
          totalCount={filteredRequests.length}
        />
        <BulkSelectionControls
          actions={[
            {
              icon: <CheckIcon />,
              label: "Approve selected",
              onSelect: () => setIsConfirmingBulkApproval(true),
              tone: "success",
            },
            {
              icon: <XIcon />,
              label: "Deny selected",
              onSelect: () => setDenyingRequestIds(selectedRequestIds),
              tone: "danger",
            },
          ]}
          allSelectedLabel="Select all visible reward requests"
          isAllSelected={areAllVisibleRequestsSelected}
          onVisibleSelectionChange={handleVisibleSelectionChange}
          selectedCount={selectedRequestIds.length}
        />
      </div>
    </TableToolbar>
  );

  return (
    <section className={`min-w-0 ${className}`}>
      <FixedNotification error={error} message={message} />
      <div className="relative z-10 min-w-0 overflow-x-clip">
        {visibleRequests.length === 0 && tableToolbar}
        {isLoading && (
          <LoadingSkeleton className="px-0" lines={4} />
        )}
        {!isLoading && error && requests.length === 0 && (
          <LoadFailure
            description="Reward requests could not be retrieved."
            onRetry={refreshRequests}
            title="Could not load reward requests"
          />
        )}
        {!isLoading && !error && visibleRequests.length === 0 && (
          <p className="text-sm text-text-muted">
            {activeView === "pending"
              ? "No pending requests."
              : "No recent requests."}
          </p>
        )}
        {!isLoading && visibleRequests.length > 0 && (
          <ShopRequestList
            currencyName={currencyName}
            filters={filters}
            onApprove={handleApprove}
            onClearFilters={() => setFilters(emptyShopRequestTableFilters)}
            onDeny={(requestId) => setDenyingRequestIds([requestId])}
            onFiltersChange={setFilters}
            onRequestSelectionChange={handleRequestSelectionChange}
            onSortChange={(column, direction) => setTableSort(direction ? { column, direction } : null)}
            onVisibleSelectionChange={handleVisibleSelectionChange}
            requests={displayedRequests}
            selectedRequestIds={selectedRequestIds}
            tableSort={tableSort}
            toolbar={tableToolbar}
            showDecisionNote={activeView === "recent"}
            visibleRequestsSelected={areAllVisibleRequestsSelected}
          />
        )}
      </div>

      {denyingRequestIds.length > 0 && (
        <TextReasonModal
          confirmLabel="Deny Request"
          description={`The reserved balance and stock will be released for ${denyingRequestIds.length === 1 ? "this request" : `${denyingRequestIds.length} requests`}.`}
          isRequired
          onCancel={() => setDenyingRequestIds([])}
          onConfirm={handleDeny}
          title="Deny Reward Request"
        />
      )}
      {isConfirmingBulkApproval && (
        <ConfirmationModal
          confirmLabel="Approve Requests"
          description={`Approve ${selectedRequestIds.length} selected reward requests?`}
          isConfirming={isApprovingBulkRequests}
          onCancel={() => setIsConfirmingBulkApproval(false)}
          onConfirm={handleBulkApprove}
          title="Approve selected requests"
          tone="success"
        />
      )}
    </section>
  );
}

function ShopRequestList({
  currencyName,
  filters,
  onApprove,
  onClearFilters,
  onDeny,
  onFiltersChange,
  onRequestSelectionChange,
  onSortChange,
  onVisibleSelectionChange,
  requests,
  selectedRequestIds,
  tableSort,
  showDecisionNote,
  toolbar,
  visibleRequestsSelected,
}: {
  currencyName: string;
  filters: ShopRequestTableFilters;
  onApprove: (purchaseId: string) => void;
  onClearFilters: () => void;
  onDeny: (purchaseId: string) => void;
  onFiltersChange: (filters: ShopRequestTableFilters) => void;
  onRequestSelectionChange: (requestId: string, isSelected: boolean) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  onVisibleSelectionChange: (isSelected: boolean) => void;
  requests: ShopPurchaseRequest[];
  selectedRequestIds: string[];
  tableSort: { column: string; direction: TableSortDirection } | null;
  showDecisionNote: boolean;
  toolbar: ReactNode;
  visibleRequestsSelected: boolean;
}) {
  return (
    <CompactShopRequestList
      currencyName={currencyName}
      filters={filters}
      onApprove={onApprove}
      onClearFilters={onClearFilters}
      onDeny={onDeny}
      onFiltersChange={onFiltersChange}
      onRequestSelectionChange={onRequestSelectionChange}
      onSortChange={onSortChange}
      onVisibleSelectionChange={onVisibleSelectionChange}
      requests={requests}
      selectedRequestIds={selectedRequestIds}
      tableSort={tableSort}
      showDecisionNote={showDecisionNote}
      toolbar={toolbar}
      visibleRequestsSelected={visibleRequestsSelected}
    />
  );
}

function CompactShopRequestList({
  currencyName,
  filters,
  onApprove,
  onClearFilters,
  onDeny,
  onFiltersChange,
  onRequestSelectionChange,
  onSortChange,
  onVisibleSelectionChange,
  requests,
  selectedRequestIds,
  tableSort,
  showDecisionNote,
  toolbar,
  visibleRequestsSelected,
}: {
  currencyName: string;
  filters: ShopRequestTableFilters;
  onApprove: (purchaseId: string) => void;
  onClearFilters: () => void;
  onDeny: (purchaseId: string) => void;
  onFiltersChange: (filters: ShopRequestTableFilters) => void;
  onRequestSelectionChange: (requestId: string, isSelected: boolean) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  onVisibleSelectionChange: (isSelected: boolean) => void;
  requests: ShopPurchaseRequest[];
  selectedRequestIds: string[];
  tableSort: { column: string; direction: TableSortDirection } | null;
  showDecisionNote: boolean;
  toolbar: ReactNode;
  visibleRequestsSelected: boolean;
}) {
  const selectedRequestIdSet = new Set(selectedRequestIds);
  const selectableRequestIds = requests
    .filter((request) => request.status === "pending")
    .map((request) => request.id);

  function updateFilter<Field extends keyof ShopRequestTableFilters>(
    field: Field,
    value: ShopRequestTableFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      <DataTable ariaLabel="Reward requests" toolbar={toolbar}>
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="hidden w-[24%] md:table-column" />
            <col className="hidden w-28 sm:table-column" />
            <col className="hidden w-28 lg:table-column" />
            {showDecisionNote && (
              <col className="hidden w-[22%] lg:table-column" />
            )}
            <col className="w-28 sm:w-40" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <DataTableSelectionHeader
                checked={visibleRequestsSelected}
                label={
                  visibleRequestsSelected
                    ? "Clear selected reward requests"
                    : "Select all visible reward requests"
                }
                onChange={onVisibleSelectionChange}
              />
              <th scope="col" className="py-3 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.item)}
                  label="Request"
                  onClear={() => updateFilter("item", "")}
                  onSortDirectionChange={(direction) => onSortChange("item", direction)}
                  sortDirection={tableSort?.column === "item" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Request"
                    onChange={(value) => updateFilter("item", value)}
                    value={filters.item}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="hidden py-3 pr-4 font-semibold md:table-cell">
                <TableHeaderFilter
                  isActive={Boolean(filters.student)}
                  label="Student"
                  onClear={() => updateFilter("student", "")}
                  onSortDirectionChange={(direction) => onSortChange("student", direction)}
                  sortDirection={tableSort?.column === "student" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Student"
                    onChange={(value) => updateFilter("student", value)}
                    value={filters.student}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="hidden py-3 pr-4 text-right font-semibold sm:table-cell">
                <TableHeaderFilter label="Cost" onSortDirectionChange={(direction) => onSortChange("cost", direction)} sortDirection={tableSort?.column === "cost" ? tableSort.direction : null} />
              </th>
              <th scope="col" className="hidden py-3 pr-4 font-semibold lg:table-cell">
                <TableHeaderFilter
                  isActive={Boolean(filters.status)}
                  label="Status"
                  onClear={() => updateFilter("status", "")}
                  onSortDirectionChange={(direction) => onSortChange("status", direction)}
                  sortDirection={tableSort?.column === "status" ? tableSort.direction : null}
                >
                  <TableHeaderFilterSelect
                    label="Status"
                    onChange={(value) =>
                      updateFilter(
                        "status",
                        value as ShopRequestTableFilters["status"],
                      )
                    }
                    options={[
                      { label: "Any status", value: "" },
                      { label: "Pending", value: "pending" },
                      { label: "Approved", value: "approved" },
                      { label: "Denied", value: "denied" },
                    ]}
                    value={filters.status}
                  />
                </TableHeaderFilter>
              </th>
              {showDecisionNote && (
                <th scope="col" className="hidden py-3 pr-4 font-semibold lg:table-cell">
                  <TableHeaderFilter
                    isActive={Boolean(filters.decisionNote)}
                    label="Comment"
                    onClear={() => updateFilter("decisionNote", "")}
                    onSortDirectionChange={(direction) => onSortChange("comment", direction)}
                    sortDirection={tableSort?.column === "comment" ? tableSort.direction : null}
                  >
                    <TableHeaderFilterInput
                      label="Comment"
                      onChange={(value) => updateFilter("decisionNote", value)}
                      value={filters.decisionNote}
                    />
                  </TableHeaderFilter>
                </th>
              )}
              <th scope="col" className="py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr className="border-b border-border-subtle transition hover:bg-panel-soft/60" key={request.id}>
                <DataTableSelectionCell
                  checked={selectedRequestIdSet.has(request.id)}
                  disabled={request.status !== "pending"}
                  label={`Select ${request.itemName} for ${request.studentName}`}
                  rangeKey="reward-requests-table"
                  rowId={request.id}
                  selectableRowIds={selectableRequestIds}
                  onRangeChange={(ids, isSelected) =>
                    ids.forEach((id) => onRequestSelectionChange(id, isSelected))
                  }
                  onChange={(isSelected) =>
                    onRequestSelectionChange(request.id, isSelected)
                  }
                />
                <td className="py-3 pr-4">
                  <p className="truncate text-[13px] font-semibold text-text-control sm:text-sm">
                    {request.itemName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted md:hidden">
                    {request.studentName} · {formatAmount(request.price)} {currencyName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {formatDateTime(request.purchasedAt)}
                  </p>
                  <div className="mt-1 lg:hidden">
                    <ShopRequestStatusBadge request={request} />
                  </div>
                  {showDecisionNote && request.decisionNote && (
                    <p className="mt-1 truncate text-xs text-text-muted lg:hidden">
                      {request.decisionNote}
                    </p>
                  )}
                </td>
                <td className="hidden py-3 pr-4 md:table-cell">
                  <p className="truncate text-sm font-semibold text-text-control">
                    {request.studentName}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {request.studentUsername}
                  </p>
                </td>
                <td className="hidden py-3 pr-4 text-right sm:table-cell">
                  <DataTableCurrencyValue
                    amount={formatAmount(request.price)}
                    currencyName={currencyName}
                  />
                </td>
                <td className="hidden py-3 pr-4 lg:table-cell">
                  <ShopRequestStatusBadge request={request} />
                </td>
                {showDecisionNote && (
                  <td className="hidden py-3 pr-4 text-sm text-text-muted lg:table-cell">
                    {request.decisionNote || "No comment"}
                  </td>
                )}
                <td className="py-2 pl-3">
                  <ShopRequestActions
                    onApprove={onApprove}
                    onDeny={onDeny}
                    request={request}
                  />
                </td>
              </tr>
            ))}
          </tbody>
      </DataTable>
      {requests.length === 0 && (
        <EmptyState
          action={
            <IconButton
              label="Clear reward request filters"
              onClick={onClearFilters}
              text="Clear Filters"
            >
              <XIcon />
            </IconButton>
          }
          description="Try changing or clearing the filters to see more reward requests."
          icon={<ShoppingCartIcon />}
          title="No matching reward requests"
        />
      )}
    </>
  );
}

function ShopRequestActions({
  onApprove,
  onDeny,
  request,
}: {
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  if (request.status !== "pending") {
    return <span className="block text-center text-xs text-text-muted">Complete</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        aria-label={`Deny ${request.itemName} for ${request.studentName}`}
        className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-negative-border bg-negative-fill text-negative-ink shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-negative-ink hover:bg-negative-border hover:shadow-md focus-visible:-translate-y-px focus-visible:border-negative-ink focus-visible:bg-negative-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative-ink focus-visible:ring-offset-1 active:translate-y-0 active:scale-[0.97]"
        onClick={() => onDeny(request.id)}
        title="Deny request"
        type="button"
      >
        <XIcon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110" />
      </button>
      <button
        aria-label={`Approve ${request.itemName} for ${request.studentName}`}
        className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-positive-border bg-positive-fill text-positive-ink shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-positive-ink hover:bg-positive-border hover:shadow-md focus-visible:-translate-y-px focus-visible:border-positive-ink focus-visible:bg-positive-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive-ink focus-visible:ring-offset-1 active:translate-y-0 active:scale-[0.97]"
        onClick={() => onApprove(request.id)}
        title="Approve request"
        type="button"
      >
        <CheckIcon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110" />
      </button>
    </div>
  );
}

function ShopRequestStatusBadge({
  request,
}: {
  request: ShopPurchaseRequest;
}) {
  return (
    <StatusBadge
      label={getShopRequestStatusLabel(request)}
      tone={getShopRequestStatusTone(request)}
    />
  );
}

function matchesShopRequestTableFilters(
  request: ShopPurchaseRequest,
  filters: ShopRequestTableFilters,
) {
  return (
    includesFilter(request.itemName, filters.item) &&
    includesFilter(
      `${request.studentName} ${request.studentUsername}`,
      filters.student,
    ) &&
    includesFilter(request.decisionNote, filters.decisionNote) &&
    (!filters.status || request.status === filters.status)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function getShopRequestStatusLabel(request: ShopPurchaseRequest) {
  if (request.isVoided) {
    return "Archived";
  }

  if (request.status === "pending") {
    return "Pending";
  }

  if (request.status === "approved") {
    return "Approved";
  }

  return "Denied";
}

function getShopRequestStatusTone(request: ShopPurchaseRequest): StatusTone {
  if (request.isVoided || request.status === "denied") {
    return "danger";
  }

  if (request.status === "pending") {
    return "warning";
  }

  return "success";
}
