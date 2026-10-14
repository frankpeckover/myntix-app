"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listAuditLog } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv/client";
import { formatDateTime } from "@/lib/presentation/formatters";
import type { AuditLogItem } from "@/domains/audit/audit-service";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EyeIcon, FileDownIcon, XIcon } from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { ModalShell } from "@/components/ui/modal-shell";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableActionGrid } from "@/components/ui/table-action-grid";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { DataTable } from "@/components/ui/data-table";
import { sortTableItems, type TableSortDirection } from "@/components/ui/table-sorting";

type AuditFilters = {
  action: string;
  actor: string;
  details: string;
  record: string;
};

const emptyAuditFilters: AuditFilters = {
  action: "",
  actor: "",
  details: "",
  record: "",
};

export function AdminAuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogItem[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(emptyAuditFilters);
  const [tableSort, setTableSort] = useState<{ column: string; direction: TableSortDirection } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewingEntry, setViewingEntry] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAuditLog() {
      try {
        const loadedEntries = await listAuditLog();

        if (isMounted) {
          setEntries(loadedEntries);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load audit log.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAuditLog();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesAuditFilters(entry, filters)),
    [entries, filters],
  );
  const sortedEntries = useMemo(
    () => sortTableItems(filteredEntries, tableSort, (entry, column) => {
      switch (column) {
        case "time": return entry.createdAt;
        case "action": return entry.action;
        case "actor": return entry.actorName ?? entry.actorUsername;
        case "record": return entry.entityType;
        case "details": return JSON.stringify(entry.details);
        default: return "";
      }
    }),
    [filteredEntries, tableSort],
  );
  const {
    page,
    pageItems: visibleEntries,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
  } = usePagedList(sortedEntries);

  function clearAuditFilters() {
    setFilters(emptyAuditFilters);
  }

  return (
    <AdminPageSection isFlush>
      <FixedNotification error={error} />
      <div>
        {isLoading && (
          <LoadingSkeleton className="px-0" lines={5} />
        )}
        {!isLoading && error && entries.length === 0 && (
          <LoadFailure
            description="Audit records could not be retrieved."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not load the audit log"
          />
        )}
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-text-muted">No audit events recorded yet.</p>
        )}
        {!isLoading && entries.length > 0 && (
          <>
            <AuditLogList
              entries={visibleEntries}
              filters={filters}
              onDetailsClick={setViewingEntry}
              onFiltersChange={setFilters}
              onSortChange={(column, direction) => setTableSort(direction ? { column, direction } : null)}
              tableSort={tableSort}
              toolbar={
                <TableToolbar
                  actions={
                    <TableActionMenu
                      label="Open audit log tools"
                      items={[
                        {
                          disabled: isLoading || sortedEntries.length === 0,
                          icon: <FileDownIcon />,
                          label: "Export audit log: CSV",
                          onSelect: () => downloadAuditLog(sortedEntries),
                        },
                      ]}
                    />
                  }
                >
                  <p className="text-sm font-semibold text-text-muted">
                    Showing {visibleEntries.length} of {sortedEntries.length} audit events.
                  </p>
                </TableToolbar>
              }
            />
            {sortedEntries.length === 0 && (
              <EmptyState
                action={
                  <IconButton
                    label="Clear audit filters"
                    onClick={clearAuditFilters}
                    text="Clear Filters"
                  >
                    <XIcon />
                  </IconButton>
                }
                description="Try changing or clearing the filters to see more audit events."
                title="No matching audit events"
              />
            )}
            {sortedEntries.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                totalCount={sortedEntries.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>

      {viewingEntry && (
        <AuditLogDetailsModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </AdminPageSection>
  );
}

function AuditLogList({
  entries,
  filters,
  onDetailsClick,
  onFiltersChange,
  onSortChange,
  toolbar,
  tableSort,
}: {
  entries: AuditLogItem[];
  filters: AuditFilters;
  onDetailsClick: (entry: AuditLogItem) => void;
  onFiltersChange: (filters: AuditFilters) => void;
  onSortChange: (column: string, direction: TableSortDirection | null) => void;
  tableSort: { column: string; direction: TableSortDirection } | null;
  toolbar?: ReactNode;
}) {
  function updateFilter(field: keyof AuditFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid gap-2 md:hidden">
        {entries.map((entry) => (
          <AuditLogMobileRow
            entry={entry}
            key={entry.id}
            onDetailsClick={onDetailsClick}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-clip md:block">
        <DataTable ariaLabel="Audit log" className="min-w-[760px]" toolbar={toolbar}>
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  onSortDirectionChange={(direction) => onSortChange("time", direction)}
                  sortDirection={tableSort?.column === "time" ? tableSort.direction : null}
                  label="Time"
                />
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.action)}
                  label="Action"
                  onClear={() => updateFilter("action", "")}
                  onSortDirectionChange={(direction) => onSortChange("action", direction)}
                  sortDirection={tableSort?.column === "action" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Action"
                    onChange={(value) => updateFilter("action", value)}
                    value={filters.action}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.actor)}
                  label="Actor"
                  onClear={() => updateFilter("actor", "")}
                  onSortDirectionChange={(direction) => onSortChange("actor", direction)}
                  sortDirection={tableSort?.column === "actor" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Actor"
                    onChange={(value) => updateFilter("actor", value)}
                    value={filters.actor}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.record)}
                  label="Record"
                  onClear={() => updateFilter("record", "")}
                  onSortDirectionChange={(direction) => onSortChange("record", direction)}
                  sortDirection={tableSort?.column === "record" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Record"
                    onChange={(value) => updateFilter("record", value)}
                    value={filters.record}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.details)}
                  label="Details"
                  onClear={() => updateFilter("details", "")}
                  onSortDirectionChange={(direction) => onSortChange("details", direction)}
                  sortDirection={tableSort?.column === "details" ? tableSort.direction : null}
                >
                  <TableHeaderFilterInput
                    label="Details"
                    onChange={(value) => updateFilter("details", value)}
                    value={filters.details}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <td className="py-3 pr-4 text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge
                    label={formatAction(entry.action)}
                    tone={getActionTone(entry.action)}
                  />
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatActor(entry)}
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatEntity(entry)}
                </td>
                <td className="break-words py-3 pr-4 text-text-muted">
                  {formatDetails(entry.details)}
                </td>
                <td className="py-3 text-right">
                  <TableActionGrid
                    label="Open audit event actions"
                    items={[
                      {
                        icon: <EyeIcon />,
                        label: "View details",
                        onSelect: () => onDetailsClick(entry),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}

function AuditLogMobileRow({
  entry,
  onDetailsClick,
}: {
  entry: AuditLogItem;
  onDetailsClick: (entry: AuditLogItem) => void;
}) {
  return (
    <article className="theme-card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {formatAction(entry.action)}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(entry.createdAt)}
        </p>
        <p className="mt-1 truncate text-sm text-text-muted">
          {formatActor(entry)}
        </p>
      </div>
      <IconButton
        label="Audit event details"
        onClick={() => onDetailsClick(entry)}
      >
        <EyeIcon />
      </IconButton>
    </article>
  );
}

function AuditLogDetailsModal({
  entry,
  onClose,
}: {
  entry: AuditLogItem;
  onClose: () => void;
}) {
  return (
    <ModalShell
      actions={
        <StatusBadge
          label={formatAction(entry.action)}
          tone={getActionTone(entry.action)}
        />
      }
      description={formatDateTime(entry.createdAt)}
      onClose={onClose}
      title="Audit Details"
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <AuditDetail label="Action" value={formatAction(entry.action)} />
        <AuditDetail label="Actor" value={formatActor(entry)} />
        <AuditDetail label="Record" value={formatEntity(entry)} />
        <AuditDetail label="Details" value={formatDetails(entry.details)} />
      </dl>
    </ModalShell>
  );
}

function AuditDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-text-control">{value}</dd>
    </div>
  );
}

function formatActor(entry: AuditLogItem) {
  if (entry.actorName && entry.actorUsername) {
    return `${entry.actorName} (${entry.actorUsername})`;
  }

  return entry.actorName ?? entry.actorUsername ?? "System";
}

function formatAction(action: string) {
  return action
    .split(".")
    .map(formatEntityType)
    .join(" ");
}

function formatEntity(entry: AuditLogItem) {
  const entityType = formatEntityType(entry.entityType);

  if (!entry.entityId) {
    return entityType;
  }

  return `${entityType} ${entry.entityId}`;
}

function formatEntityType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDetails(details: Record<string, unknown>) {
  const visibleEntries = Object.entries(details).filter(([, value]) =>
    isSimpleDetail(value),
  );

  if (visibleEntries.length === 0) {
    return "-";
  }

  return visibleEntries
    .slice(0, 3)
    .map(([key, value]) => `${formatEntityType(key)}: ${formatDetailValue(value)}`)
    .join(", ");
}

function formatDetailValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "✓" : "✕";
  }

  return String(value);
}

function isSimpleDetail(value: unknown) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function getActionTone(action: string): StatusTone {
  if (
    action.includes("denied") ||
    action.includes("disabled") ||
    action.includes("removed") ||
    action.includes("voided")
  ) {
    return "danger";
  }

  if (
    action.includes("approved") ||
    action.includes("created") ||
    action.includes("enabled")
  ) {
    return "success";
  }

  if (action.includes("updated") || action.includes("changed")) {
    return "warning";
  }

  return "neutral";
}

function matchesAuditFilters(entry: AuditLogItem, filters: AuditFilters) {
  return (
    includesFilter(formatAction(entry.action), filters.action) &&
    includesFilter(formatActor(entry), filters.actor) &&
    includesFilter(formatEntity(entry), filters.record) &&
    includesFilter(formatDetails(entry.details), filters.details)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function downloadAuditLog(entries: AuditLogItem[]) {
  downloadCsv(
    "audit-log.csv",
    ["time", "action", "actor", "record", "details"],
    entries.map((entry) => [
      formatDateTime(entry.createdAt),
      formatAction(entry.action),
      formatActor(entry),
      formatEntity(entry),
      formatDetails(entry.details),
    ]),
  );
}
