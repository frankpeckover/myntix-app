import type { ShopPurchaseRequest } from "@/domains/rewards/shop-service";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

export type ShopRequestTableFilters = {
  decisionNote: string;
  item: string;
  status: "" | ShopPurchaseRequest["status"];
  student: string;
};

export function ShopRequestActions({
  onApprove,
  onDeny,
  request,
  mobile = false,
}: {
  mobile?: boolean;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  if (request.status !== "pending") {
    return <span className="block text-center text-xs text-text-muted">Complete</span>;
  }

  return (
    <div className={mobile ? "inline-flex shrink-0 gap-2" : "flex items-center justify-end gap-1.5"}>
      <button
        aria-label={`Deny ${request.itemName} for ${request.studentName}`}
        className={`group inline-flex ${mobile ? "h-11 w-11" : "h-8 w-8"} shrink-0 items-center justify-center rounded-md border border-negative-border bg-negative-fill text-negative-ink shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-negative-ink hover:bg-negative-border hover:shadow-md focus-visible:-translate-y-px focus-visible:border-negative-ink focus-visible:bg-negative-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative-ink focus-visible:ring-offset-1 active:translate-y-0 active:scale-[0.97]`}
        onClick={() => onDeny(request.id)}
        title="Deny request"
        type="button"
      >
        <XIcon className={`${mobile ? "h-5 w-5" : "h-4 w-4"} shrink-0 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110`} />
      </button>
      <button
        aria-label={`Approve ${request.itemName} for ${request.studentName}`}
        className={`group inline-flex ${mobile ? "h-11 w-11" : "h-8 w-8"} shrink-0 items-center justify-center rounded-md border border-positive-border bg-positive-fill text-positive-ink shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-positive-ink hover:bg-positive-border hover:shadow-md focus-visible:-translate-y-px focus-visible:border-positive-ink focus-visible:bg-positive-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive-ink focus-visible:ring-offset-1 active:translate-y-0 active:scale-[0.97]`}
        onClick={() => onApprove(request.id)}
        title="Approve request"
        type="button"
      >
        <CheckIcon className={`${mobile ? "h-5 w-5" : "h-4 w-4"} shrink-0 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110`} />
      </button>
    </div>
  );
}

export function ShopRequestStatusBadge({
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
