"use client";

import { useEffect, useRef, useState } from "react";
import {
  approveShopRequest,
  denyShopRequest,
  listStaffShopRequests,
} from "@/lib/actions";
import type { ShopPurchaseRequest } from "@/domains/rewards/shop-service";
import { formatAmount, formatDateTime } from "@/lib/presentation/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { CheckIcon, ShoppingCartIcon, XIcon } from "@/components/ui/icons";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type ShopRequestTableFilters = {
  item: string;
  status: "" | ShopPurchaseRequest["status"];
  student: string;
};

const emptyShopRequestTableFilters: ShopRequestTableFilters = {
  item: "",
  status: "",
  student: "",
};

type ShopRequestsPanelProps = {
  className?: string;
  compact?: boolean;
  currencyName: string;
  helpText?: string;
  maxVisibleRequests?: number;
  onRequestActioned?: () => void;
  showViewToggle?: boolean;
  title?: string;
};

export function ShopRequestsPanel({
  className = "mt-5",
  compact = false,
  currencyName,
  helpText,
  maxVisibleRequests,
  onRequestActioned,
  showViewToggle = true,
  title = "Reward Requests",
}: ShopRequestsPanelProps) {
  const [requests, setRequests] = useState<ShopPurchaseRequest[]>([]);
  const [activeView, setActiveView] = useState<"pending" | "recent">("pending");
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    onRequestActioned?.();
    refreshRequests();
  }

  async function handleDeny(decisionNote: string) {
    if (!denyingRequestId) {
      return;
    }
    if (pendingDecisionIdsRef.current.has(denyingRequestId)) {
      return;
    }
    if (!navigator.onLine) {
      setError("You are offline. Reconnect before denying a request.");
      return;
    }
    setError(null);
    setMessage(null);
    pendingDecisionIdsRef.current.add(denyingRequestId);

    const purchaseId = denyingRequestId;
    let result;

    try {
      result = await denyShopRequest(purchaseId, decisionNote);
    } catch {
      setError("Could not confirm the denial. Refresh before trying again.");
      pendingDecisionIdsRef.current.delete(purchaseId);
      return;
    }
    pendingDecisionIdsRef.current.delete(purchaseId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDenyingRequestId(null);
    setMessage("Request denied.");
    onRequestActioned?.();
    refreshRequests();
  }

  const filteredRequests =
    activeView === "pending"
      ? requests.filter((request) => request.status === "pending")
      : requests.filter((request) => request.status !== "pending");
  const visibleRequests =
    maxVisibleRequests === undefined
      ? filteredRequests
      : filteredRequests.slice(0, maxVisibleRequests);
  const pendingRequestCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  return (
    <section
      className={`${
        compact
          ? "wallet-card reward-requests-card rounded-3xl border border-brand-soft-strong shadow-sm"
          : "theme-panel"
      } motion-panel p-4 ${className}`}
    >
      <FixedNotification error={error} message={message} />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-panel-soft text-text-muted">
            <ShoppingCartIcon />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              {helpText && <InfoTooltip label={helpText} />}
            </div>
            {!compact && (
              <p className="mt-2 inline-flex rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {pendingRequestCount} pending
              </p>
            )}
          </div>
        </div>
        {showViewToggle && (
          <div className="flex rounded-md border border-border bg-surface p-1">
            {(["pending", "recent"] as const).map((view) => (
              <button
                className={`rounded-sm px-3 py-1.5 text-sm font-semibold ${
                  activeView === view
                    ? "bg-brand text-white"
                    : "text-text-control hover:bg-surface-hover"
                }`}
                key={view}
                onClick={() => setActiveView(view)}
                type="button"
              >
                {view === "pending" ? "Pending" : "Recent"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-4">
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
            compact={compact}
            currencyName={currencyName}
            onApprove={handleApprove}
            onDeny={setDenyingRequestId}
            requests={visibleRequests}
          />
        )}
      </div>

      {denyingRequestId && (
        <TextReasonModal
          confirmLabel="Deny Request"
          description="The reserved balance and stock will be released."
          isRequired
          onCancel={() => setDenyingRequestId(null)}
          onConfirm={handleDeny}
          title="Deny Reward Request"
        />
      )}
    </section>
  );
}

function ShopRequestList({
  compact,
  currencyName,
  onApprove,
  onDeny,
  requests,
}: {
  compact: boolean;
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  requests: ShopPurchaseRequest[];
}) {
  if (compact) {
    return (
      <CompactShopRequestList
        currencyName={currencyName}
        onApprove={onApprove}
        onDeny={onDeny}
        requests={requests}
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <ShopRequestCard
          currencyName={currencyName}
          key={request.id}
          onApprove={onApprove}
          onDeny={onDeny}
          request={request}
        />
      ))}
    </div>
  );
}

function CompactShopRequestList({
  currencyName,
  onApprove,
  onDeny,
  requests,
}: {
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  requests: ShopPurchaseRequest[];
}) {
  const [filters, setFilters] = useState<ShopRequestTableFilters>(
    emptyShopRequestTableFilters,
  );
  const filteredRequests = requests.filter((request) =>
    matchesShopRequestTableFilters(request, filters),
  );

  function updateFilter<Field extends keyof ShopRequestTableFilters>(
    field: Field,
    value: ShopRequestTableFilters[Field],
  ) {
    setFilters({ ...filters, [field]: value });
  }

  function clearFilters() {
    setFilters(emptyShopRequestTableFilters);
  }

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {filteredRequests.map((request) => (
          <CompactShopRequestMobileRow
            currencyName={currencyName}
            key={request.id}
            onApprove={onApprove}
            onDeny={onDeny}
            request={request}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <table aria-label="Reward requests" className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.item)}
                  label="Request"
                  onClear={() => updateFilter("item", "")}
                >
                  <TableHeaderFilterInput
                    label="Request"
                    onChange={(value) => updateFilter("item", value)}
                    value={filters.item}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.student)}
                  label="Student"
                  onClear={() => updateFilter("student", "")}
                >
                  <TableHeaderFilterInput
                    label="Student"
                    onChange={(value) => updateFilter("student", value)}
                    value={filters.student}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">Cost</th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.status)}
                  label="Status"
                  onClear={() => updateFilter("status", "")}
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
              <th scope="col" className="py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr className="border-b border-border-subtle" key={request.id}>
                <td className="py-2 pr-4">
                  <p className="truncate text-sm font-semibold text-text-control">
                    {request.itemName}
                  </p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {formatDateTime(request.purchasedAt)}
                  </p>
                </td>
                <td className="py-2 pr-4">
                  <p className="truncate text-sm font-semibold text-text-control">
                    {request.studentName}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {request.studentUsername}
                  </p>
                </td>
                <td className="py-2 pr-4">
                  <span className="text-sm font-semibold">
                    {formatAmount(request.price)} {currencyName}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <ShopRequestStatusBadge request={request} />
                </td>
                <td className="py-2 text-right">
                  <ShopRequestActions
                    onApprove={onApprove}
                    onDeny={onDeny}
                    request={request}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredRequests.length === 0 && (
        <EmptyState
          action={
            <IconButton
              label="Clear reward request filters"
              onClick={clearFilters}
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

function CompactShopRequestMobileRow({
  currencyName,
  onApprove,
  onDeny,
  request,
}: {
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  return (
    <article className="theme-card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{request.itemName}</p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(request.purchasedAt)}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {request.studentName}
        </p>
        <p className="mt-1">
          <span className="text-sm font-semibold">
            {formatAmount(request.price)} {currencyName}
          </span>
        </p>
      </div>
      <ShopRequestActions
        onApprove={onApprove}
        onDeny={onDeny}
        request={request}
      />
    </article>
  );
}

function ShopRequestCard({
  currencyName,
  onApprove,
  onDeny,
  request,
}: {
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  return (
    <article className="theme-card p-3 transition hover:border-brand-soft-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <ShoppingCartIcon />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold">{request.itemName}</h4>
            <p className="truncate text-sm text-text-muted">
              {request.studentName} ({request.studentUsername})
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-border-subtle pt-3">
        <ShopRequestStatusBadge request={request} />
        <p className="truncate text-center text-xs text-text-muted">
          {formatDateTime(request.purchasedAt)}
        </p>
        <p className="inline-flex items-baseline gap-1 whitespace-nowrap rounded-md bg-brand-soft px-2.5 py-1.5 text-right text-xs text-text-muted">
          <span className="font-number text-sm font-semibold text-brand-ink">
            {formatAmount(request.price)}
          </span>
          <span>{currencyName}</span>
        </p>
      </div>
      {request.decisionNote && (
        <p className="mt-2 text-sm text-text-muted">{request.decisionNote}</p>
      )}
      {request.status === "pending" && (
        <ShopRequestDecisionButtons
          onApprove={() => onApprove(request.id)}
          onDeny={() => onDeny(request.id)}
        />
      )}
    </article>
  );
}

function ShopRequestDecisionButtons({
  onApprove,
  onDeny,
}: {
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2 border-t border-border-subtle pt-3">
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-danger-action px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        onClick={onDeny}
        type="button"
      >
        <XIcon />
        Deny
      </button>
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-success-action px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        onClick={onApprove}
        type="button"
      >
        <CheckIcon />
        Approve
      </button>
    </div>
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
    return null;
  }

  return (
    <TableActionMenu
      label={`Open actions for ${request.itemName}`}
      items={[
        {
          icon: <CheckIcon />,
          label: "Approve",
          onSelect: () => onApprove(request.id),
          tone: "success",
        },
        {
          icon: <XIcon />,
          label: "Deny",
          onSelect: () => onDeny(request.id),
          tone: "danger",
        },
      ]}
    />
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
    (!filters.status || request.status === filters.status)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function getShopRequestStatusLabel(request: ShopPurchaseRequest) {
  if (request.isVoided) {
    return "Voided";
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
