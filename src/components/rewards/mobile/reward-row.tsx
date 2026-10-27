import type { ReactNode } from "react";
import type { ShopItem } from "@/domains/rewards/shop-service";
import { MobileListRow } from "@/components/ui/mobile-list-row";
import { IconButton } from "@/components/ui/icon-button";
import { CheckIcon, EyeIcon, ShoppingCartIcon } from "@/components/ui/icons";
import { formatAmount } from "@/lib/presentation/formatters";

export function MobileRewardRow({ item, currencyName, requested = false, onView, onPurchase, managementActions, selected, onSelectionChange }: {
  item: ShopItem;
  currencyName: string;
  requested?: boolean;
  onView: (item: ShopItem) => void;
  onPurchase?: (id: string) => void;
  onSelectionChange?: (selected: boolean) => void;
  managementActions?: ReactNode;
  selected?: boolean;
}) {
  const unavailable = !item.isActive || (!item.isQuantityUnlimited && item.quantity <= 0);

  return (
    <MobileListRow selected={selected} onSelectionChange={onSelectionChange} selectionLabel={`Select ${item.name}`}
      value={<>
        <span className="block font-number text-base font-semibold text-text-control">{formatAmount(item.price)}</span>
        <span className="block max-w-20 break-words text-xs text-text-muted">{currencyName}</span>
      </>}
      actions={managementActions ?? <div className="flex items-center gap-1">
        <IconButton size="touch" label={`View ${item.name}`} onClick={() => onView(item)}><EyeIcon /></IconButton>
        {onPurchase && <IconButton size="touch"
          label={requested ? `${item.name} is in your cart` : unavailable ? `${item.name} is unavailable` : `Add ${item.name} to cart`}
          tone={requested ? "success" : "default"} disabled={unavailable || requested} onClick={() => onPurchase(item.id)}>
          {requested ? <CheckIcon /> : <ShoppingCartIcon />}
        </IconButton>}
      </div>}>
      <h2 className="line-clamp-2 text-sm font-semibold text-text-control" title={item.name}>{item.name}</h2>
      {!item.isActive ? <p className="mt-1 text-xs text-danger-strong">Archived</p>
        : unavailable ? <p className="mt-1 text-xs text-text-muted">Unavailable</p> : null}
    </MobileListRow>
  );
}
