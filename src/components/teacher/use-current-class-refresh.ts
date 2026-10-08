"use client";

import { useEffect, useRef } from "react";

const currentClassRefreshIntervalMs = 60_000;
const refreshDebounceMs = 3_000;

export function useCurrentClassRefresh(refresh: () => void) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let lastRefreshAt = 0;

    function refreshWhenVisible() {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - lastRefreshAt < refreshDebounceMs) return;
      lastRefreshAt = now;
      refreshRef.current();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refreshWhenVisible();
    }

    const intervalId = window.setInterval(
      refreshWhenVisible,
      currentClassRefreshIntervalMs,
    );
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
