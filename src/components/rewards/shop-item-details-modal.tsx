"use client";

import type { ReactNode } from "react";
import { formatCurrencyAmount } from "@/lib/presentation/formatters";
import type { ShopItem } from "@/domains/rewards/shop-service";
import { CheckIcon, PencilIcon, ShoppingBagIcon, TicketIcon } from "@/components/ui/icons";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

type ShopItemDetailsModalProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onClose: () => void;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  requested: boolean;
};

export function ShopItemDetailsModal({
  canManage,
  currencyName,
  item,
  onClose,
  onEdit,
  onPurchase,
  requested,
}: ShopItemDetailsModalProps) {
  const dialogRef = useDialogFocus({ onEscape: onClose });

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-label={`Reward details: ${item.name}`}
        aria-modal="true"
        className="app-modal theme-panel motion-pop relative max-h-full w-full max-w-xl overflow-y-auto p-5 shadow-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <ShopItemDetailsImage item={item} />

        <div className="app-modal-header mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold">{item.name}</h3>
            {!item.isActive && (
              <span className="mt-2 inline-flex rounded-sm bg-danger-soft px-2 py-1 text-xs font-semibold text-danger-strong">
                Removed
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canManage && (
              <ModalIconButton
                label="Edit item"
                onClick={() => onEdit(item)}
              >
                <PencilIcon className="h-4 w-4" />
              </ModalIconButton>
            )}
            <ModalCloseButton onClick={onClose} />
          </div>
        </div>

        <div className="app-modal-body grid gap-3 sm:grid-cols-2">
          <ShopItemDetail label="Cost" value={formatCurrencyAmount(item.price, currencyName)} />
          <ShopItemDetail
            label="Available"
            value={getAvailabilityLabel(item)}
          />
        </div>

        <div className="theme-subpanel mt-4 p-3">
          <p className="text-sm font-semibold text-text-control">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">
            {item.description || "No description"}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!canManage && (
            <button
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                requested
                  ? "border border-success-border bg-success-soft text-success"
                  : "bg-brand text-white hover:bg-brand-hover"
              }`}
              disabled={(!item.isQuantityUnlimited && item.quantity <= 0) || requested}
              onClick={() => onPurchase(item.id)}
              type="button"
            >
              {requested ? (
                <>
                  <CheckIcon />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBagIcon />
                  Add to Cart
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getAvailabilityLabel(item: ShopItem) {
  if (item.isQuantityUnlimited) {
    return "Unlimited";
  }

  return item.quantity <= 0 ? "Unavailable" : `${item.quantity} left`;
}

function ModalIconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-muted hover:text-text-control"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ShopItemDetailsImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="aspect-[5/3] rounded-md bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <div className="reward-shine flex aspect-[5/3] items-center justify-center rounded-md bg-brand-soft text-brand">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface/85 shadow-sm">
        <TicketIcon className="h-8 w-8" />
      </div>
    </div>
  );
}

function ShopItemDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="theme-card p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
