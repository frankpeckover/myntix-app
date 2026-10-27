import type { ShopPurchaseRequest } from "@/domains/rewards/shop-service";
import type { TableSortState } from "@/components/ui/table-sorting";
import { RowSelectionCheckbox } from "@/components/ui/bulk-selection-controls";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { LoadFailure } from "@/components/ui/load-failure";
import { TableHeaderFilter, TableHeaderFilterInput, TableHeaderFilterSelect } from "@/components/ui/table-header-filter";
import type { ShopRequestTableFilters } from "@/components/rewards/shared/request-presentation";
import { MobileRequestCard } from "@/components/rewards/mobile/request-card";
import { IconButton } from "@/components/ui/icon-button";
import { PageResultCount } from "@/components/ui/page-result-count";

type MobileShopRequestsProps = {
  activeView: "pending" | "recent";
  allSelected: boolean;
  currencyName: string;
  error: string | null;
  filters: ShopRequestTableFilters;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onApproveSelected: () => void;
  onClearFilters: () => void;
  onDeny: (id: string) => void;
  onDenySelected: () => void;
  onFiltersChange: (filters: ShopRequestTableFilters) => void;
  onRequestSelectionChange: (id: string, selected: boolean) => void;
  onRetry: () => void;
  onSortChange: (sort: TableSortState) => void;
  onViewChange: (view: "pending" | "recent") => void;
  onVisibleSelectionChange: (selected: boolean) => void;
  requests: ShopPurchaseRequest[];
  selectedRequestIds: string[];
  showViewToggle: boolean;
  tableSort: TableSortState;
  totalCount: number;
};

const sortColumns = [
  { label: "Reward", value: "item" },
  { label: "Student", value: "student" },
  { label: "Cost", value: "cost" },
  { label: "Status", value: "status" },
  { label: "Comment", value: "comment" },
];

export function MobileShopRequests({
  activeView, allSelected, currencyName, error, filters, isLoading,
  onApprove, onApproveSelected, onClearFilters, onDeny, onDenySelected,
  onFiltersChange, onRequestSelectionChange, onRetry, onSortChange,
  onViewChange, onVisibleSelectionChange, requests, selectedRequestIds,
  showViewToggle, tableSort, totalCount,
}: MobileShopRequestsProps) {
  const selectedIds = new Set(selectedRequestIds);
  const hasFilters = Object.values(filters).some(Boolean);
  const selectableRequests = requests.filter((request) => request.status === "pending");
  const canSelect = selectableRequests.length > 0;

  function updateFilter<Key extends keyof ShopRequestTableFilters>(key: Key, value: ShopRequestTableFilters[Key]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-3" data-request-layout="mobile">
      <PageResultCount mobile>
        Showing {requests.length} of {totalCount} {activeView} reward requests.
      </PageResultCount>
      {showViewToggle && (
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1" role="group" aria-label="Request view">
          {(["pending", "recent"] as const).map((view) => (
            <button key={view} type="button" aria-pressed={activeView === view}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${activeView === view ? "bg-brand text-[color:var(--brand-foreground)]" : "text-text-control hover:bg-panel-soft"}`}
              onClick={() => onViewChange(view)}>
              {view === "pending" ? "Pending" : "Recent"}
            </button>
          ))}
        </div>
      )}
      <div className="flex min-h-11 items-center justify-between gap-2 text-sm text-text-muted">
        {selectedIds.size > 0 && <p className="inline-flex items-center gap-2" role="status">
          <CheckIcon className="h-4 w-4" />
          <span className="font-number">{selectedIds.size} selected</span>
        </p>}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {canSelect && <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-2 hover:bg-panel-soft" title="Select all visible requests">
            <RowSelectionCheckbox checked={allSelected} label="Select all visible reward requests" onChange={onVisibleSelectionChange} />
            <span>Select all</span>
          </label>}
          <TableHeaderFilter label="Reward requests" iconOnly isActive={hasFilters || Boolean(tableSort)}>
        <div className="space-y-3">
          <TableHeaderFilterInput label="Student" value={filters.student} onChange={(value) => updateFilter("student", value)} />
          <TableHeaderFilterInput label="Reward" value={filters.item} onChange={(value) => updateFilter("item", value)} />
          {activeView === "recent" && <>
            <TableHeaderFilterSelect label="Status" value={filters.status}
              onChange={(value) => updateFilter("status", value as ShopRequestTableFilters["status"])}
              options={[{ label: "Any status", value: "" }, { label: "Approved", value: "approved" }, { label: "Denied", value: "denied" }]} />
            <TableHeaderFilterInput label="Comment" value={filters.decisionNote} onChange={(value) => updateFilter("decisionNote", value)} />
          </>}
          <TableHeaderFilterSelect label="Sort by" value={tableSort?.column ?? ""}
            onChange={(column) => onSortChange(column ? { column, direction: tableSort?.direction ?? "ascending" } : null)}
            options={[{ label: "Default order", value: "" }, ...sortColumns.filter((column) => activeView === "recent" || !["status", "comment"].includes(column.value))]} />
          {tableSort && <TableHeaderFilterSelect label="Order" value={tableSort.direction}
            onChange={(direction) => onSortChange({ ...tableSort, direction: direction as "ascending" | "descending" })}
            options={[{ label: "Ascending", value: "ascending" }, { label: "Descending", value: "descending" }]} />}
          {hasFilters && <button className="min-h-11 text-sm font-medium text-brand underline underline-offset-4" onClick={onClearFilters} type="button">Clear filters</button>}
        </div>
          </TableHeaderFilter>
        </div>
      </div>
      {selectedIds.size > 0 && <div className="flex items-center justify-end gap-3">
        <IconButton size="touch" label="Deny selected requests" tone="danger" onClick={onDenySelected} disabled={isLoading}>
          <XIcon className="h-5 w-5" />
        </IconButton>
        <IconButton size="touch" label="Approve selected requests" tone="success" onClick={onApproveSelected} disabled={isLoading}>
          <CheckIcon className="h-5 w-5" />
        </IconButton>
      </div>}
      {isLoading ? <LoadingSkeleton className="px-0" lines={3} /> : error && totalCount === 0 ? (
        <LoadFailure title="Could not load reward requests" description="Reward requests could not be retrieved." onRetry={onRetry} />
      ) : requests.length === 0 ? (
        <div className="rounded-lg bg-surface p-4 text-sm text-text-muted">
          <p>{hasFilters ? "No matching requests." : `No ${activeView} requests.`}</p>
          {hasFilters && <button className="mt-2 min-h-11 text-brand underline underline-offset-4" onClick={onClearFilters} type="button">Clear filters</button>}
        </div>
      ) : <ul className="space-y-3" aria-label="Reward requests">
        {requests.map((request) => (
          <MobileRequestCard key={request.id} request={request} currencyName={currencyName}
            selected={selectedIds.has(request.id)} onApprove={onApprove} onDeny={onDeny}
            onSelectionChange={onRequestSelectionChange} />
        ))}
      </ul>}
    </div>
  );
}
