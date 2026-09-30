"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  getStudentBalance,
  listShopItems,
  removeShopItem,
  requestShopItem,
  setShopItemActive,
} from "@/lib/actions";
import { downloadCsv } from "@/lib/csv/client";
import { formatAmount, formatCurrencyAmount } from "@/lib/presentation/formatters";
import { canManageShopItems } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { ShopItem } from "@/domains/rewards/shop-service";
import { ShopImportModal } from "@/components/rewards/shop-import-modal";
import { ShopItemCard } from "@/components/rewards/shop-item-card";
import { ShopItemDetailsModal } from "@/components/rewards/shop-item-details-modal";
import { ShopItemModal } from "@/components/rewards/shop-item-modal";
import {
  BulkSelectionControls,
  MobileSelectionShell,
  RowSelectionCheckbox,
} from "@/components/ui/bulk-selection-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import {
  CopyIcon,
  CheckIcon,
  EyeIcon,
  FileDownIcon,
  FileUpIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  WalletIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";

type ShopPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

type ShopFiltersState = {
  description: string;
  name: string;
  priceMax: string;
  priceMin: string;
  showArchivedItems: boolean;
};

export function ShopPanel({ currencyName, currentUser }: ShopPanelProps) {
  const canManage = canManageShopItems(currentUser);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filters, setFilters] = useState<ShopFiltersState>({
    description: "",
    name: "",
    priceMax: "",
    priceMin: "",
    showArchivedItems: false,
  });
  const [balance, setBalance] = useState<number | null>(null);
  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [duplicatingItem, setDuplicatingItem] = useState<ShopItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [removingItemIds, setRemovingItemIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [viewingItem, setViewingItem] = useState<ShopItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const purchasePendingRef = useRef(false);
  const purchaseRequestRef = useRef<{ itemId: string; requestId: string } | null>(
    null,
  );

  async function refreshItems() {
    setIsLoading(true);

    try {
      const loadedItems = await listShopItems(canManage);
      setItems(loadedItems);
      setError(null);
    } catch {
      setError("Could not load reward items.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshBalance() {
    if (canManage) {
      return;
    }

    try {
      const currentBalance = await getStudentBalance();
      setBalance(currentBalance);
    } catch {
      setError("Could not load wallet balance.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const loadedItems = await listShopItems(canManage);

        if (isMounted) {
          setItems(loadedItems);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load reward items.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [canManage]);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      if (canManage) {
        return;
      }

      try {
        const currentBalance = await getStudentBalance();

        if (isMounted) {
          setBalance(currentBalance);
        }
      } catch {
        if (isMounted) {
          setError("Could not load wallet balance.");
        }
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, [canManage, currentUser]);

  function updateFilter<Field extends keyof ShopFiltersState>(
    field: Field,
    value: ShopFiltersState[Field],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function openNewItemModal() {
    setDuplicatingItem(null);
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function openEditItemModal(item: ShopItem) {
    setDuplicatingItem(null);
    setEditingItem(item);
    setViewingItem(null);
    setIsModalOpen(true);
  }

  function openDuplicateItemModal(item: ShopItem) {
    setDuplicatingItem(item);
    setEditingItem(null);
    setViewingItem(null);
    setIsModalOpen(true);
  }

  async function handleRemove(itemId: string) {
    const result = await removeShopItem(itemId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Item removed.");
    refreshItems();
  }

  async function handleItemStatusChange(item: ShopItem) {
    const nextActiveState = !item.isActive;
    const result = await setShopItemActive(item.id, nextActiveState);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(nextActiveState ? "Reward enabled." : "Reward archived.");
    setError(null);
    await refreshItems();
  }

  function handleItemSelectionChange(itemId: string, isSelected: boolean) {
    setSelectedItemIds((currentItemIds) =>
      isSelected
        ? [...new Set([...currentItemIds, itemId])]
        : currentItemIds.filter((currentItemId) => currentItemId !== itemId),
    );
  }

  function handleVisibleItemsSelectionChange(isSelected: boolean) {
    const visibleItemIds = pageItems.map((item) => item.id);

    setSelectedItemIds((currentItemIds) =>
      isSelected
        ? [...new Set([...currentItemIds, ...visibleItemIds])]
        : currentItemIds.filter((itemId) => !visibleItemIds.includes(itemId)),
    );
  }

  async function confirmBulkRemoveItems() {
    if (removingItemIds.length === 0) {
      return;
    }

    for (const itemId of removingItemIds) {
      const result = await removeShopItem(itemId);

      if (!result.ok) {
        setError(result.message);
        return;
      }
    }

    setMessage(`${removingItemIds.length} reward items archived.`);
    setError(null);
    setRemovingItemIds([]);
    setSelectedItemIds([]);
    await refreshItems();
  }

  async function handlePurchase(itemId: string) {
    if (purchasePendingRef.current) {
      return;
    }

    if (!navigator.onLine) {
      setError("You are offline. Reconnect before adding a reward to your cart.");
      return;
    }

    purchasePendingRef.current = true;
    const request =
      purchaseRequestRef.current?.itemId === itemId
        ? purchaseRequestRef.current
        : { itemId, requestId: crypto.randomUUID() };
    purchaseRequestRef.current = request;

    let result;

    try {
      result = await requestShopItem(itemId, request.requestId);
    } catch {
      setError("Could not confirm the request. Reconnect and try again safely.");
      purchasePendingRef.current = false;
      return;
    }

    if (!result.ok) {
      setError(result.message);
      purchaseRequestRef.current = null;
      purchasePendingRef.current = false;
      return;
    }

    purchaseRequestRef.current = null;
    purchasePendingRef.current = false;
    setMessage("Added to cart.");
    setViewingItem((currentItem) =>
      currentItem?.id === itemId
        ? {
            ...currentItem,
            quantity: currentItem.isQuantityUnlimited
              ? currentItem.quantity
              : currentItem.quantity - 1,
          }
        : currentItem,
    );
    setRequestedItemIds((currentItemIds) =>
      currentItemIds.includes(itemId)
        ? currentItemIds
        : [...currentItemIds, itemId],
    );
    refreshBalance();
    refreshItems();
  }

  function handleItemSaved() {
    setDuplicatingItem(null);
    setIsModalOpen(false);
    setMessage("Reward item saved.");
    refreshItems();
  }

  function clearShopFilters() {
    setFilters({
      description: "",
      name: "",
      priceMax: "",
      priceMin: "",
      showArchivedItems: false,
    });
    setSelectedItemIds([]);
  }

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        matchesShopFilters(item, {
          ...filters,
          showArchivedItems: canManage && filters.showArchivedItems,
        }),
      ),
    [canManage, filters, items],
  );
  const {
    page,
    pageItems,
    setPage,
    totalPages,
  } = usePagedList(visibleItems);

  return (
    <section className="motion-panel mt-5">
      <FixedNotification error={error} message={message} />

      {!canManage && (
        <StudentShopWallet balance={balance} currencyName={currencyName} />
      )}

      {canManage ? (
        <ShopManagementList
          currencyName={currencyName}
          filters={filters}
          isLoading={isLoading}
          items={pageItems}
          onDuplicate={openDuplicateItemModal}
          onEdit={openEditItemModal}
          onImportItems={() => setIsImportModalOpen(true)}
          onItemsExport={() => downloadShopItems(visibleItems)}
          onNewItem={openNewItemModal}
          onClearFilters={clearShopFilters}
          onPriceMaxChange={(value) => updateFilter("priceMax", value)}
          onPriceMinChange={(value) => updateFilter("priceMin", value)}
          onStatusChange={handleItemStatusChange}
          onSearchChange={(field, value) => updateFilter(field, value)}
          onSelectionChange={handleItemSelectionChange}
          onVisibleItemsSelectionChange={handleVisibleItemsSelectionChange}
          onShowArchivedItemsChange={(value) =>
            updateFilter("showArchivedItems", value)
          }
          onBulkRemove={(itemIds) => setRemovingItemIds(itemIds)}
          onView={setViewingItem}
          selectedItemIds={selectedItemIds}
          totalItemCount={items.length}
          visibleItemCount={visibleItems.length}
        />
      ) : (
        <StudentShopGrid
          currencyName={currencyName}
          isLoading={isLoading}
          items={items}
          onEdit={openEditItemModal}
          onPurchase={handlePurchase}
          onRemove={handleRemove}
          onView={setViewingItem}
          pageItems={pageItems}
          requestedItemIds={requestedItemIds}
          visibleItemCount={visibleItems.length}
        />
      )}

      {!isLoading && visibleItems.length > 0 && (
        <ListPagination
          onPageChange={setPage}
          page={page}
          totalCount={visibleItems.length}
          totalPages={totalPages}
        />
      )}

      {isModalOpen && (
        <ShopItemModal
          initialForm={
            duplicatingItem
              ? {
                  description: duplicatingItem.description,
                  imageUrl: duplicatingItem.imageUrl,
                  name: `${duplicatingItem.name} Copy`,
                  price: String(duplicatingItem.price),
                  quantity: String(duplicatingItem.quantity),
                  isQuantityUnlimited: duplicatingItem.isQuantityUnlimited,
                }
              : undefined
          }
          item={editingItem}
          onClose={() => {
            setDuplicatingItem(null);
            setIsModalOpen(false);
          }}
          onSaved={handleItemSaved}
        />
      )}

      {isImportModalOpen && (
        <ShopImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshItems}
          onImported={(importMessage, shouldClose = true) => {
            setMessage(importMessage);
            if (shouldClose) {
              setIsImportModalOpen(false);
            }
          }}
        />
      )}

      {viewingItem && (
        <ShopItemDetailsModal
          canManage={canManage}
          currencyName={currencyName}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={openEditItemModal}
          onPurchase={handlePurchase}
          requested={requestedItemIds.includes(viewingItem.id)}
        />
      )}

      {removingItemIds.length > 0 && (
        <ConfirmationModal
          confirmLabel="Archive Rewards"
          description={`Archive ${removingItemIds.length} selected reward items?`}
          onCancel={() => setRemovingItemIds([])}
          onConfirm={confirmBulkRemoveItems}
          title="Archive selected rewards"
          tone="danger"
        />
      )}
    </section>
  );
}

function ShopManagementList({
  currencyName,
  filters,
  isLoading,
  items,
  onDuplicate,
  onEdit,
  onImportItems,
  onItemsExport,
  onNewItem,
  onPriceMaxChange,
  onPriceMinChange,
  onStatusChange,
  onSearchChange,
  onBulkRemove,
  onClearFilters,
  onSelectionChange,
  onVisibleItemsSelectionChange,
  onShowArchivedItemsChange,
  onView,
  selectedItemIds,
  totalItemCount,
  visibleItemCount,
}: {
  currencyName: string;
  filters: ShopFiltersState;
  isLoading: boolean;
  items: ShopItem[];
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onImportItems: () => void;
  onItemsExport: () => void;
  onNewItem: () => void;
  onPriceMaxChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onStatusChange: (item: ShopItem) => void;
  onSearchChange: (
    field: "description" | "name",
    value: string,
  ) => void;
  onBulkRemove: (itemIds: string[]) => void;
  onClearFilters: () => void;
  onSelectionChange: (itemId: string, isSelected: boolean) => void;
  onVisibleItemsSelectionChange: (isSelected: boolean) => void;
  onShowArchivedItemsChange: (value: boolean) => void;
  onView: (item: ShopItem) => void;
  selectedItemIds: string[];
  totalItemCount: number;
  visibleItemCount: number;
}) {
  const areAllVisibleItemsSelected =
    items.length > 0 && items.every((item) => selectedItemIds.includes(item.id));

  if (isLoading) {
    return <p className="mt-4 text-sm text-text-muted">Loading rewards...</p>;
  }

  if (totalItemCount === 0) {
    return (
      <div className="mt-4">
        <ShopEmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <IconButton
                label="New item"
                onClick={onNewItem}
                text="New Reward"
                tone="primary"
              >
                <PlusIcon />
              </IconButton>
              <IconButton
                label="Import rewards: CSV"
                onClick={onImportItems}
                text="Import Rewards: CSV"
              >
                <FileUpIcon />
              </IconButton>
            </div>
          }
          isManagementView
          totalItemCount={totalItemCount}
        />
      </div>
    );
  }

  return (
    <>
      <TableToolbar
        actions={
          <>
            <IconButton
              label="New item"
              onClick={onNewItem}
              text="New Reward"
              tone="primary"
            >
              <PlusIcon />
            </IconButton>
            <TableActionMenu
              label="Open reward table tools"
              items={[
                {
                  icon: <FileUpIcon />,
                  label: "Import rewards: CSV",
                  onSelect: onImportItems,
                },
                {
                  disabled: visibleItemCount === 0,
                  icon: <FileDownIcon />,
                  label: "Export rewards: CSV",
                  onSelect: onItemsExport,
                },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-text-muted">
            Showing {items.length} of {visibleItemCount} rewards.
          </p>
          <BulkSelectionControls
            actions={[
              {
                disabled: selectedItemIds.length === 0,
                icon: <TrashIcon />,
                label: "Archive selected",
                onSelect: () => onBulkRemove(selectedItemIds),
                tone: "danger",
              },
            ]}
            allSelectedLabel="Select all rewards"
            isAllSelected={areAllVisibleItemsSelected}
            onVisibleSelectionChange={onVisibleItemsSelectionChange}
            selectedCount={selectedItemIds.length}
          />
        </div>
      </TableToolbar>

      <table aria-label="Rewards" className="hidden w-full table-fixed border-collapse text-left text-sm md:table">
        <colgroup>
          <col className="w-10" />
          <col className="w-[26%]" />
          <col className="w-[32%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">
              <RowSelectionCheckbox
                checked={areAllVisibleItemsSelected}
                label={
                  areAllVisibleItemsSelected
                    ? "Clear selected rewards"
                    : "Select all rewards"
                }
                onChange={onVisibleItemsSelectionChange}
              />
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.name)}
                label="Reward"
                onClear={() => onSearchChange("name", "")}
              >
                <TableHeaderFilterInput
                  label="Search items"
                  onChange={(value) => onSearchChange("name", value)}
                  value={filters.name}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.description)}
                label="Description"
                onClear={() => onSearchChange("description", "")}
              >
                <TableHeaderFilterInput
                  label="Search descriptions"
                  onChange={(value) => onSearchChange("description", value)}
                  value={filters.description}
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.priceMin || filters.priceMax)}
                label="Cost"
                onClear={() => {
                  onPriceMaxChange("");
                  onPriceMinChange("");
                }}
              >
                <div className="grid gap-3">
                  <TableHeaderFilterInput
                    label="Minimum"
                    onChange={onPriceMinChange}
                    type="number"
                    value={filters.priceMin}
                  />
                  <TableHeaderFilterInput
                    label="Maximum"
                    onChange={onPriceMaxChange}
                    type="number"
                    value={filters.priceMax}
                  />
                </div>
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">Quantity</th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={filters.showArchivedItems}
                label="Status"
                onClear={() => onShowArchivedItemsChange(false)}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    onShowArchivedItemsChange(value === "includeArchived")
                  }
                  options={[
                    { label: "Active only", value: "activeOnly" },
                    { label: "Include archived", value: "includeArchived" },
                  ]}
                  value={
                    filters.showArchivedItems
                      ? "includeArchived"
                      : "activeOnly"
                  }
                />
              </TableHeaderFilter>
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-b border-border-subtle" key={item.id}>
              <td className="py-3 pr-3">
                <RowSelectionCheckbox
                  checked={selectedItemIds.includes(item.id)}
                  label={`Select ${item.name}`}
                  onChange={(isSelected) =>
                    onSelectionChange(item.id, isSelected)
                  }
                />
              </td>
              <td className="py-3 pr-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ShopTableImage item={item} />
                  <span className="truncate font-semibold">{item.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-text-muted">
                <span className="line-clamp-2">{item.description || "-"}</span>
              </td>
              <td className="py-3 pr-4 text-right font-semibold">
                {formatAmount(item.price)}
                <span className="ml-1 text-xs font-normal text-text-muted">
                  {currencyName}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-text-muted">
                {formatItemQuantity(item)}
              </td>
              <td className="py-3 pr-4">
                <ShopItemStatusBadge item={item} />
              </td>
              <td className="py-3 text-right">
                <ShopManagementActions
                  item={item}
                  onDuplicate={onDuplicate}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                  onView={onView}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 grid gap-3 md:hidden">
        {items.map((item) => (
          <ShopManagementCard
            currencyName={currencyName}
            item={item}
            key={item.id}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onSelectionChange={onSelectionChange}
            onView={onView}
            selected={selectedItemIds.includes(item.id)}
          />
        ))}
      </div>
      {visibleItemCount === 0 && (
        <ShopEmptyState
          action={
            <IconButton
              label="Clear reward filters"
              onClick={onClearFilters}
              text="Clear Filters"
            >
              <XIcon />
            </IconButton>
          }
          isManagementView
          totalItemCount={totalItemCount}
        />
      )}
    </>
  );
}

function ShopManagementCard({
  currencyName,
  item,
  onDuplicate,
  onEdit,
  onStatusChange,
  onSelectionChange,
  onView,
  selected,
}: {
  currencyName: string;
  item: ShopItem;
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onStatusChange: (item: ShopItem) => void;
  onSelectionChange: (itemId: string, isSelected: boolean) => void;
  onView: (item: ShopItem) => void;
  selected: boolean;
}) {
  return (
    <article className="rounded-md bg-surface p-3">
      <MobileSelectionShell
        checkbox={
          <RowSelectionCheckbox
            checked={selected}
            label={`Select ${item.name}`}
            onChange={(isSelected) => onSelectionChange(item.id, isSelected)}
          />
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ShopTableImage item={item} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{item.name}</h3>
              <p className="mt-1 truncate text-sm text-text-muted">
                {item.description || "No description"}
              </p>
            </div>
          </div>
          <ShopManagementActions
            item={item}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onView={onView}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span>
            {formatAmount(item.price)} {currencyName}
          </span>
          <span>{getItemAvailabilityLabel(item)}</span>
          <ShopItemStatusBadge item={item} />
        </div>
      </MobileSelectionShell>
    </article>
  );
}

function StudentShopGrid({
  currencyName,
  isLoading,
  items,
  onEdit,
  onPurchase,
  onRemove,
  onView,
  pageItems,
  requestedItemIds,
  visibleItemCount,
}: {
  currencyName: string;
  isLoading: boolean;
  items: ShopItem[];
  onEdit: (item: ShopItem) => void;
  onPurchase: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onView: (item: ShopItem) => void;
  pageItems: ShopItem[];
  requestedItemIds: string[];
  visibleItemCount: number;
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading && (
        <p className="text-sm text-text-muted">Loading rewards...</p>
      )}
      {!isLoading &&
        pageItems.map((item) => (
          <ShopItemCard
            canManage={false}
            currencyName={currencyName}
            item={item}
            key={item.id}
            onEdit={onEdit}
            onPurchase={onPurchase}
            onRemove={onRemove}
            onView={onView}
            requested={requestedItemIds.includes(item.id)}
          />
        ))}
      {!isLoading && visibleItemCount === 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <ShopEmptyState
            isManagementView={false}
            totalItemCount={items.length}
          />
        </div>
      )}
    </div>
  );
}

function StudentShopWallet({
  balance,
  currencyName,
}: {
  balance: number | null;
  currencyName: string;
}) {
  const walletLabel =
    balance === null
      ? "Loading wallet..."
      : formatCurrencyAmount(balance, currencyName);

  return (
    <div className="shop-wallet-card wallet-card flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-transparent px-5 py-4 text-foreground sm:px-6">
      <div className="relative flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface/80 text-brand">
          <WalletIcon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
            Wallet
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">
            {walletLabel}
          </p>
        </div>
      </div>
      <ShoppingBagIcon className="relative hidden h-8 w-8 shrink-0 text-brand sm:block" />
    </div>
  );
}

function ShopTableImage({ item }: { item: ShopItem }) {
  if (item.imageUrl) {
    return (
      <div
        aria-label={`${item.name} image`}
        className="h-10 w-10 shrink-0 rounded-md bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
      <PackageIcon className="h-4 w-4" />
    </span>
  );
}

function ShopManagementActions({
  item,
  onDuplicate,
  onEdit,
  onStatusChange,
  onView,
}: {
  item: ShopItem;
  onDuplicate: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  onStatusChange: (item: ShopItem) => void;
  onView: (item: ShopItem) => void;
}) {
  return (
    <TableActionMenu
      label={`Open actions for ${item.name}`}
      items={[
        {
          icon: <EyeIcon />,
          label: "View",
          onSelect: () => onView(item),
        },
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEdit(item),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicate(item),
        },
        {
          icon: item.isActive ? <TrashIcon /> : <CheckIcon />,
          label: item.isActive ? "Archive" : "Enable",
          onSelect: () => onStatusChange(item),
          tone: item.isActive ? "danger" : "primary",
        },
      ]}
    />
  );
}

function ShopItemStatusBadge({ item }: { item: ShopItem }) {
  if (!item.isActive) {
    return <StatusBadge label="Archived" tone="danger" />;
  }

  if (!item.isQuantityUnlimited && item.quantity <= 0) {
    return <StatusBadge label="Unavailable" tone="warning" />;
  }

  return <StatusBadge label="Active" tone="success" />;
}

function ShopEmptyState({
  action,
  isManagementView,
  totalItemCount,
}: {
  action?: ReactNode;
  isManagementView: boolean;
  totalItemCount: number;
}) {
  return (
    <EmptyState
      action={action}
      description={
        totalItemCount === 0
          ? isManagementView
            ? "Create the first reward item so students have something to request."
            : "Rewards will appear here once staff add them."
          : "Try changing the reward filters."
      }
      icon={<ShoppingBagIcon />}
      title={totalItemCount === 0 ? "No rewards yet" : "No matching rewards"}
    />
  );
}

function matchesShopFilters(item: ShopItem, filters: ShopFiltersState) {
  if (!filters.showArchivedItems && !item.isActive) {
    return false;
  }

  if (!matchesPriceFilter(item.price, filters.priceMin, filters.priceMax)) {
    return false;
  }

  return (
    includesFilter(item.name, filters.name) &&
    includesFilter(item.description, filters.description)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function matchesPriceFilter(price: number, minimum: string, maximum: string) {
  const minimumPrice = parsePriceFilter(minimum);
  const maximumPrice = parsePriceFilter(maximum);

  if (minimumPrice !== null && price < minimumPrice) {
    return false;
  }

  if (maximumPrice !== null && price > maximumPrice) {
    return false;
  }

  return true;
}

function parsePriceFilter(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.abs(parsedValue);
}

function downloadShopItems(items: ShopItem[]) {
  downloadCsv(
    "reward-items.csv",
    [
      "id",
      "name",
      "description",
      "price",
      "quantity",
      "unlimited_quantity",
      "status",
      "image_url",
    ],
    items.map((item) => [
      item.id,
      item.name,
      item.description,
      item.price,
      item.quantity,
      item.isQuantityUnlimited,
      item.isActive ? "active" : "archived",
      item.imageUrl,
    ]),
  );
}

function formatItemQuantity(item: ShopItem) {
  return item.isQuantityUnlimited ? "Unlimited" : String(item.quantity);
}

function getItemAvailabilityLabel(item: ShopItem) {
  return item.isQuantityUnlimited
    ? "Unlimited"
    : `${formatItemQuantity(item)} available`;
}
