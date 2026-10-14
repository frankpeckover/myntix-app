"use client";

import { useSyncExternalStore } from "react";

type TableLayout = "desktop" | "mobile" | null;

let mediaQuery: MediaQueryList | undefined;

function getMediaQuery() {
  return mediaQuery ??= window.matchMedia("(min-width: 768px)");
}

function subscribe(onChange: () => void) {
  const query = getMediaQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): TableLayout {
  return getMediaQuery().matches ? "desktop" : "mobile";
}

function getServerSnapshot(): TableLayout {
  // Keep both CSS-responsive views during SSR and hydration.
  return null;
}

export function useTableLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
