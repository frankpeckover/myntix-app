"use client";

import { useEffect, useState } from "react";
import { listStudentShopRequests } from "@/lib/actions";
import type { StudentShopRequest } from "@/domains/rewards/shop-service";
import { formatDateTime } from "@/lib/presentation/formatters";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { LoadFailure } from "@/components/ui/load-failure";
import { PackageIcon, ShoppingBagIcon, TrophyIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

type StudentShopRequestsPanelProps = {
  className?: string;
  onBrowseRewards: () => void;
};

export function StudentShopRequestsPanel({
  className = "",
  onBrowseRewards,
}: StudentShopRequestsPanelProps) {
  const [requests, setRequests] = useState<StudentShopRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const loadedRequests = await listStudentShopRequests();

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
  }, [reloadKey]);

  return (
    <section
      className={`student-dashboard-card student-cart-card rounded-3xl border border-transparent bg-surface p-4 sm:p-5 ${className}`}
    >
      <FixedNotification error={error} />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <ShoppingBagIcon />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">My Cart</h2>
            <InfoTooltip label="Adding a reward reserves its cost from your balance while a staff member reviews the request. A denied request returns the reserved credits." />
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading && (
          <LoadingSkeleton className="px-0 py-0" lines={3} />
        )}
        {!isLoading && error && requests.length === 0 && (
          <LoadFailure
            description="Your reward request history could not be retrieved."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not load your cart"
          />
        )}
        {!isLoading && !error && requests.length === 0 && (
          <EmptyState
            action={
              <IconButton
                label="Browse rewards"
                onClick={onBrowseRewards}
                text="Browse rewards"
                tone="primary"
              >
                <TrophyIcon />
              </IconButton>
            }
            description="Choose a reward when you are ready to use your credits."
            icon={<ShoppingBagIcon />}
            title="Your cart is empty"
          />
        )}
        {!isLoading && requests.length > 0 && (
          <StudentRequestList requests={requests} />
        )}
      </div>
    </section>
  );
}

function StudentRequestList({
  requests,
}: {
  requests: StudentShopRequest[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {requests.map((request) => (
          <StudentRequestCard
            key={request.id}
            request={request}
          />
        ))}
    </div>
  );
}

function StudentRequestCard({
  request,
}: {
  request: StudentShopRequest;
}) {
  return (
    <article className="reward-shine rounded-md border border-border-subtle p-3 shadow-sm transition hover:border-border hover:bg-surface">
      <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-panel-soft text-brand">
            <PackageIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{request.itemName}</h3>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {formatDateTime(request.purchasedAt)}
            </p>
          </div>
          <StudentRequestStatusBadge request={request} />
      </div>
      {request.decisionNote && (
        <p className="mt-3 border-t border-border-muted pt-2.5 text-sm text-text-muted">
          {request.decisionNote}
        </p>
      )}
    </article>
  );
}

function StudentRequestStatusBadge({
  request,
}: {
  request: StudentShopRequest;
}) {
  const label = getRequestStatusLabel(request);
  return (
    <StatusBadge label={label} tone={getRequestStatusTone(request)} />
  );
}

function getRequestStatusLabel(request: StudentShopRequest) {
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

function getRequestStatusTone(request: StudentShopRequest): StatusTone {
  if (request.isVoided || request.status === "denied") {
    return "danger";
  }

  if (request.status === "pending") {
    return "warning";
  }

  return "success";
}
