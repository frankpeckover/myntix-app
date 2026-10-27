"use client";

import { useId, useRef } from "react";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { useTextSearchInput } from "@/components/ui/use-text-search-input";
import { minimumSearchCharacters } from "@/lib/presentation/search";

type SearchInputProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  debounceMilliseconds?: number;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SearchInput({
  ariaLabel,
  className = "",
  disabled = false,
  debounceMilliseconds,
  id,
  onChange,
  placeholder,
  value,
}: SearchInputProps) {
  const search = useTextSearchInput(value, onChange, debounceMilliseconds);
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function clearSearch() {
    search.onChange("");
    inputRef.current?.focus();
  }
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          aria-describedby={search.needsMoreCharacters ? hintId : undefined}
          aria-label={ariaLabel ?? placeholder ?? "Search"}
          className={`ui-search-input w-full rounded-md border border-border bg-surface py-3 pl-10 ${search.value ? "pr-11" : "pr-3"} text-sm outline-none ring-brand transition placeholder:text-text-muted focus:ring-2 disabled:cursor-not-allowed disabled:bg-panel-soft disabled:text-text-muted`}
          disabled={disabled}
          id={id}
          ref={inputRef}
          onChange={(event) => search.onChange(event.target.value)}
          onBlur={search.onBlur}
          onKeyDown={(event) => {
            if (event.key === "Escape" && search.value) {
              event.preventDefault();
              event.stopPropagation();
              clearSearch();
            }
          }}
          onCompositionStart={search.onCompositionStart}
          onCompositionEnd={(event) =>
            search.onCompositionEnd(event.currentTarget.value)
          }
          placeholder={placeholder}
          type="search"
          value={search.value}
        />
        {search.value && (
          <button type="button" aria-label="Clear search" title="Clear search" disabled={disabled}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-text-muted transition hover:text-text-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}>
            <XIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      {search.needsMoreCharacters && (
        <span
          className="mt-1 block text-xs text-text-muted"
          id={hintId}
          role="status"
        >
          Type at least {minimumSearchCharacters} characters to search.
        </span>
      )}
    </div>
  );
}
