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
  if (totalCount === 0) {
    return null;
  }

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-3 flex items-center justify-between gap-1 border-t border-border-subtle pt-1 text-sm md:gap-2 md:pt-3">
      <p className="shrink-0 whitespace-nowrap text-xs font-medium text-text-muted">
        <span className="hidden md:inline">Showing <span className="tabular-nums text-text-control">{rangeStart}-{rangeEnd}</span> of {totalCount}</span>
        <span className="tabular-nums md:hidden" aria-label={`${totalCount} items`}>{totalCount.toLocaleString("en-AU")}</span>
      </p>
      <div className="flex min-w-0 items-center gap-1 md:flex-wrap md:gap-3">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <span className="hidden md:inline">Rows</span>
          <select
            aria-label="Rows per page"
            className="pagination-select"
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
        <div className="inline-flex shrink-0 items-center md:gap-1">
          <button
            aria-label="Previous page"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:text-text-subtle md:h-8 md:w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <PageNumberInput key={`${page}:${totalPages}`} page={page} totalPages={totalPages} onPageChange={onPageChange} />
          <span className="whitespace-nowrap text-xs text-text-subtle"><span className="md:hidden">/ </span><span className="hidden md:inline">of </span>{totalPages}</span>
          <button
            aria-label="Next page"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:text-text-subtle md:h-8 md:w-8"
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

function PageNumberInput({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [draft, setDraft] = useState(String(page));

  function commit() {
    const requested = Number(draft);
    const nextPage = draft && Number.isSafeInteger(requested)
      ? Math.min(totalPages, Math.max(1, requested)) : page;
    setDraft(String(nextPage));
    if (nextPage !== page) onPageChange(nextPage);
  }

  return <input aria-label="Go to page" title={`Page 1 to ${totalPages}. Press Enter to go.`}
    className="pagination-page-input" type="text" inputMode="numeric" pattern="[0-9]*"
    maxLength={Math.max(2, String(totalPages).length)} value={draft}
    style={{ width: `calc(${Math.max(2, String(totalPages).length)}ch + 0.75rem)` }}
    onChange={(event) => {
      if (/^\d*$/.test(event.target.value)) setDraft(event.target.value);
    }}
    onFocus={(event) => event.currentTarget.select()}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setDraft(String(page));
      }
    }} />;
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
