"use client";

import { useSyncExternalStore } from "react";

type DashboardLayout = "mobile" | "desktop" | null;
let mediaQuery: MediaQueryList | undefined;

function getMediaQuery() {
  // Match the shell's lg sidebar breakpoint, not the table/card breakpoint.
  return mediaQuery ??= window.matchMedia("(min-width: 1024px)");
}

function subscribe(onChange: () => void) {
  const query = getMediaQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): DashboardLayout {
  return getMediaQuery().matches ? "desktop" : "mobile";
}

function getServerSnapshot(): DashboardLayout {
  return null;
}

export function useDashboardLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
