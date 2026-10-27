"use client";

import { useId, useState } from "react";
import type { ShopPurchaseRequest } from "@/domains/rewards/shop-service";
import { EyeIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { MobileListRow } from "@/components/ui/mobile-list-row";
import { ShopRequestActions, ShopRequestStatusBadge } from "@/components/rewards/shared/request-presentation";
import { formatAmount, formatDateTime } from "@/lib/presentation/formatters";

export function MobileRequestCard({ currencyName, request, selected, onApprove, onDeny, onSelectionChange }: {
  currencyName: string;
  request: ShopPurchaseRequest;
  selected: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onSelectionChange: (id: string, selected: boolean) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();

  return (
    <li>
      <MobileListRow selected={selected}
        selectionLabel={`Select ${request.itemName} for ${request.studentName}`}
        onSelectionChange={request.status === "pending" ? (checked) => onSelectionChange(request.id, checked) : undefined}
        value={<>
          <p className="font-number text-base font-semibold text-text-control">{formatAmount(request.price)}</p>
          <p className="max-w-20 break-words text-xs text-text-muted">{currencyName}</p>
        </>}
        footer={<>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
            <IconButton ariaControls={detailsId} ariaExpanded={detailsOpen} size="touch"
              label={`${detailsOpen ? "Hide" : "Show"} details for ${request.itemName}, ${request.studentName}`}
              onClick={() => setDetailsOpen((open) => !open)}>
              <EyeIcon className="h-5 w-5" />
            </IconButton>
        </div>
        {request.status === "pending"
          ? <ShopRequestActions mobile request={request} onApprove={onApprove} onDeny={onDeny} />
          : <ShopRequestStatusBadge request={request} />}
      </div>
      <div id={detailsId} hidden={!detailsOpen} className="mt-3 space-y-1.5 break-words border-t border-border-subtle pt-3 text-xs text-text-muted">
        <p>@{request.studentUsername}</p>
        <p><time dateTime={request.purchasedAt}>{formatDateTime(request.purchasedAt)}</time></p>
        {request.decisionNote && <p>{request.decisionNote}</p>}
      </div>
        </>}>
        <h2 className="break-words text-sm font-semibold text-text-control">{request.studentName}</h2>
        <p className="mt-1 break-words text-xs text-text-muted">{request.itemName}</p>
      </MobileListRow>
    </li>
  );
}
