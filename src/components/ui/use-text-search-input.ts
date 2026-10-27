"use client";

import { useEffect, useRef, useState } from "react";
import {
  isSearchReady,
  searchDebounceMilliseconds,
} from "@/lib/presentation/search";

export function useTextSearchInput(
  value: string,
  onChange: (value: string) => void,
  debounceMilliseconds = searchDebounceMilliseconds,
  enabled = true,
) {
  const [state, setState] = useState({ applied: value, draft: value });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  if (state.applied !== value) {
    setState({ applied: value, draft: value });
  }

  function cancelPending() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, [value]);

  function apply(next: string) {
    cancelPending();
    if (!enabled || !next.trim() || isSearchReady(next)) {
      const applied = next.trim() ? next : "";
      if (applied !== value) onChange(applied);
    }
  }

  function change(next: string) {
    setState({ applied: value, draft: next });
    cancelPending();
    if (composing.current) return;
    if (!enabled || !next.trim() || debounceMilliseconds === 0) {
      apply(next);
    } else if (isSearchReady(next)) {
      timer.current = setTimeout(() => apply(next), debounceMilliseconds);
    }
  }

  return {
    value: state.applied === value ? state.draft : value,
    needsMoreCharacters:
      enabled && Boolean(state.draft.trim()) && !isSearchReady(state.draft),
    onChange: change,
    onBlur: () => {
      if (!composing.current) apply(state.draft);
    },
    onCompositionStart: () => {
      composing.current = true;
      cancelPending();
    },
    onCompositionEnd: (value: string) => {
      composing.current = false;
      change(value);
    },
  };
}
