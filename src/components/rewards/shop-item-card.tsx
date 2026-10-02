import { IconButton } from "@/components/ui/icon-button";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PencilIcon,
  ShoppingBagIcon,
  TicketIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatAmount } from "@/lib/presentation/formatters";
import type { ShopItem } from "@/domains/rewards/shop-service";
import { StatusBadge } from "@/components/ui/status-badge";

type ShopItemCardProps = {
  canManage: boolean;
  currencyName: string;
  item: ShopItem;
  onDuplicate?: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
  requested: boolean;
};

export function ShopItemCard({
  canManage,
  currencyName,
  item,
  onDuplicate,
  onEdit,
  onPurchase,
  onRemove,
  onView,
  requested,
}: ShopItemCardProps) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-surface transition-colors duration-200 hover:border-border hover:bg-surface-hover ${
        requested ? "border-success-border" : "border-transparent"
      } ${!item.isActive ? "opacity-70" : ""}`}
    >
      <button
        aria-label={`View ${item.name}`}
        className="block w-full text-left"
        onClick={() => onView(item)}
        type="button"
      >
        <ShopItemImage item={item} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-semibold text-brand-ink">
              {item.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-text-muted">
              {item.description || "No description"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusBadge
              label={getAvailabilityLabel(item)}
              tone={!item.isQuantityUnlimited && item.quantity <= 0 ? "warning" : "neutral"}
            />
            {!item.isActive && (
              <StatusBadge label="Archived" tone="danger" />
            )}
          </div>
        </div>

        <div className="mt-3">
          <span className="block min-w-0 break-words text-3xl font-bold leading-tight text-brand-ink">
            {formatAmount(item.price)}
            <span className="ml-1 text-sm font-semibold text-text-muted">
              {currencyName}
            </span>
          </span>
        </div>

        <ShopItemActions
          canManage={canManage}
          currencyName={currencyName}
          item={item}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onPurchase={onPurchase}
          onRemove={onRemove}
          onView={onView}
          requested={requested}
        />
      </div>
    </article>
  );
}

function ShopItemImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="aspect-[16/7] bg-cover bg-center sm:aspect-[5/3]"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <div className="reward-shine flex aspect-[16/7] items-center justify-center bg-brand-soft text-brand sm:aspect-[5/3]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface/85 sm:h-16 sm:w-16 sm:rounded-2xl">
        <TicketIcon className="h-6 w-6 sm:h-8 sm:w-8" />
      </div>
    </div>
  );
}

function ShopItemActions({
  canManage,
  item,
  onEdit,
  onDuplicate,
  onPurchase,
  onRemove,
  onView,
  requested,
}: ShopItemCardProps) {
  if (!canManage) {
    return (
      <div className="mt-auto pt-4">
        <button
          className={`inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
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
              In cart
            </>
          ) : (
            <>
              <ShoppingBagIcon />
              Add to Cart
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto flex gap-2 pt-4">
      <IconButton label={`View ${item.name}`} onClick={() => onView(item)}>
        <EyeIcon />
      </IconButton>
      {onDuplicate && (
        <IconButton label={`Duplicate ${item.name}`} onClick={() => onDuplicate(item)}>
          <CopyIcon />
        </IconButton>
      )}
      <IconButton label={`Edit ${item.name}`} onClick={() => onEdit(item)}>
        <PencilIcon />
      </IconButton>
      {item.isActive && (
        <IconButton
          label={`Remove ${item.name}`}
          onClick={() => onRemove(item.id)}
          tone="danger"
        >
          <TrashIcon />
        </IconButton>
      )}
    </div>
  );
}

function getAvailabilityLabel(item: ShopItem) {
  if (item.isQuantityUnlimited) {
    return "Unlimited";
  }

  return item.quantity <= 0 ? "Unavailable" : `${item.quantity} left`;
}
