"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

const mobileListPageSize = 15;
const desktopListPageSize = 50;
const mobileMediaQuery = "(max-width: 767px)";

export function usePagedList<Item>(items: Item[]) {
  const { pageSize, setPageSize } = useResponsiveListPageSize();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [items.length, pageSize]);

  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;

    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    pageItems,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
  };
}

export function ListPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalCount,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-text-muted">
        Showing <span className="tabular-nums text-text-control">{rangeStart}-{rangeEnd}</span> of {totalCount}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Rows
          <select
            aria-label="Rows per page"
            className="h-8 rounded-md border border-button-border bg-surface px-2.5 text-xs font-medium text-text-control outline-none transition hover:border-border-strong focus-visible:ring-2 focus-visible:ring-brand"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {[15, 50, 100, 250, 500].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center gap-1">
          <button
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:text-text-subtle"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <select
            aria-label="Go to page"
            className="h-8 min-w-8 appearance-none rounded-md bg-transparent px-1 text-center text-xs font-semibold tabular-nums text-text-control outline-none transition hover:bg-panel-soft focus-visible:ring-2 focus-visible:ring-brand"
            onChange={(event) => onPageChange(Number(event.target.value))}
            value={page}
          >
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <option key={pageNumber} value={pageNumber}>
                  {pageNumber}
                </option>
              ),
            )}
          </select>
          <span className="text-xs text-text-subtle">of {totalPages}</span>
          <button
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:text-text-subtle"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useResponsiveListPageSize() {
  const [pageSize, setPageSize] = useState(desktopListPageSize);
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery);

    function updatePageSize() {
      if (!userSelectedPageSize) {
        setPageSize(mediaQuery.matches ? mobileListPageSize : desktopListPageSize);
      }
    }

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);

    return () => {
      mediaQuery.removeEventListener("change", updatePageSize);
    };
  }, [userSelectedPageSize]);

  function updateSelectedPageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setUserSelectedPageSize(true);
  }

  return { pageSize, setPageSize: updateSelectedPageSize };
}
