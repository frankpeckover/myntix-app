"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listErrorLog } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatters";
import type { ErrorLogItem } from "@/domains/audit/error-log-service";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import { LoadFailure } from "@/components/ui/load-failure";
import { EyeIcon, XIcon } from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { ModalShell } from "@/components/ui/modal-shell";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
} from "@/components/ui/table-header-filter";
import { TableToolbar } from "@/components/ui/table-toolbar";

type ErrorFilters = {
  message: string;
  source: string;
};

const emptyErrorFilters: ErrorFilters = {
  message: "",
  source: "",
};

export function AdminErrorLogPanel() {
  const [entries, setEntries] = useState<ErrorLogItem[]>([]);
  const [filters, setFilters] = useState<ErrorFilters>(emptyErrorFilters);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewingEntry, setViewingEntry] = useState<ErrorLogItem | null>(null);
  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesErrorFilters(entry, filters)),
    [entries, filters],
  );
  const {
    page,
    pageItems: visibleEntries,
    setPage,
    totalPages,
  } = usePagedList(filteredEntries);

  function clearErrorFilters() {
    setFilters(emptyErrorFilters);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadErrorLog() {
      try {
        const loadedEntries = await listErrorLog();

        if (isMounted) {
          setEntries(loadedEntries);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load error log.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadErrorLog();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  return (
    <AdminPageSection isFlush>
      <FixedNotification error={error} />
      <div>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading error log...</p>
        )}
        {!isLoading && error && entries.length === 0 && (
          <LoadFailure
            description="Recorded server errors could not be retrieved."
            onRetry={() => setReloadKey((current) => current + 1)}
            title="Could not load the error log"
          />
        )}
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-text-muted">No server errors recorded.</p>
        )}
        {!isLoading && entries.length > 0 && (
          <>
            <ErrorLogList
              entries={visibleEntries}
              filters={filters}
              onDetailsClick={setViewingEntry}
              onFiltersChange={setFilters}
              toolbar={
                <TableToolbar>
                  <p className="text-sm font-semibold text-text-muted">
                    Showing {visibleEntries.length} of {filteredEntries.length} errors.
                  </p>
                </TableToolbar>
              }
            />
            {filteredEntries.length === 0 && (
              <EmptyState
                action={
                  <IconButton
                    label="Clear error filters"
                    onClick={clearErrorFilters}
                    text="Clear Filters"
                  >
                    <XIcon />
                  </IconButton>
                }
                description="Try changing or clearing the filters to see more errors."
                title="No matching errors"
              />
            )}
            {filteredEntries.length > 0 && (
              <ListPagination
                onPageChange={setPage}
                page={page}
                totalCount={filteredEntries.length}
                totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>

      {viewingEntry && (
        <ErrorLogDetailsModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </AdminPageSection>
  );
}

function ErrorLogList({
  entries,
  filters,
  onDetailsClick,
  onFiltersChange,
  toolbar,
}: {
  entries: ErrorLogItem[];
  filters: ErrorFilters;
  onDetailsClick: (entry: ErrorLogItem) => void;
  onFiltersChange: (filters: ErrorFilters) => void;
  toolbar?: ReactNode;
}) {
  function updateFilter(field: keyof ErrorFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid w-full min-w-0 gap-2 md:hidden">
        {entries.map((entry) => (
          <ErrorLogMobileRow
            entry={entry}
            key={entry.id}
            onDetailsClick={onDetailsClick}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        {toolbar}
        <table aria-label="Error log" className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[48%]" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">Time</th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.source)}
                  label="Source"
                  onClear={() => updateFilter("source", "")}
                >
                  <TableHeaderFilterInput
                    label="Source"
                    onChange={(value) => updateFilter("source", value)}
                    value={filters.source}
                  />
                </TableHeaderFilter>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.message)}
                  label="Message"
                  onClear={() => updateFilter("message", "")}
                >
                  <TableHeaderFilterInput
                    label="Message"
                    onChange={(value) => updateFilter("message", value)}
                    value={filters.message}
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
                <td className="max-w-64 break-words py-3 pr-4 font-semibold">
                  {entry.source}
                </td>
                <td className="max-w-96 break-words py-3 pr-4 text-text-muted">
                  {entry.message}
                </td>
                <td className="py-3 text-right">
                  <TableActionMenu
                    label="Open error actions"
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
        </table>
      </div>
    </>
  );
}

function ErrorLogMobileRow({
  entry,
  onDetailsClick,
}: {
  entry: ErrorLogItem;
  onDetailsClick: (entry: ErrorLogItem) => void;
}) {
  return (
    <article className="theme-card flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden p-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="break-all text-sm font-semibold">{entry.source}</p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(entry.createdAt)}
        </p>
        <p className="mt-1 break-words text-sm text-text-muted">
          {entry.message}
        </p>
      </div>
      <div className="shrink-0">
        <IconButton label="Error details" onClick={() => onDetailsClick(entry)}>
          <EyeIcon />
        </IconButton>
      </div>
    </article>
  );
}

function ErrorLogDetailsModal({
  entry,
  onClose,
}: {
  entry: ErrorLogItem;
  onClose: () => void;
}) {
  return (
    <ModalShell
      description={formatDateTime(entry.createdAt)}
      maxWidthClassName="max-w-3xl"
      onClose={onClose}
      title="Error Details"
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <ErrorDetail label="Source" value={entry.source} />
        <ErrorDetail label="Message" value={entry.message} />
      </dl>

      <ErrorCodeBlock label="Context" value={JSON.stringify(entry.context, null, 2)} />
      {entry.stack && <ErrorCodeBlock label="Stack" value={entry.stack} />}
    </ModalShell>
  );
}

function ErrorDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-text-control">
        {value}
      </dd>
    </div>
  );
}

function ErrorCodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-border-subtle bg-panel-soft p-3 text-xs text-text-control">
        {value}
      </pre>
    </div>
  );
}

function matchesErrorFilters(entry: ErrorLogItem, filters: ErrorFilters) {
  return (
    includesFilter(entry.source, filters.source) &&
    includesFilter(entry.message, filters.message)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
