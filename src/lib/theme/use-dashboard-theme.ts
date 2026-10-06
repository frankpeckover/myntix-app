"use client";

import { useEffect, useState } from "react";
import {
  dashboardThemeBackgrounds,
  dashboardThemeOptions,
  dashboardThemeStorageKey,
  defaultDashboardTheme,
  isDashboardTheme,
  type DashboardTheme,
} from "@/lib/theme/dashboard-theme-config";

export function useDashboardTheme() {
  const [dashboardTheme, setDashboardThemeState] =
    useState<DashboardTheme>(defaultDashboardTheme);

  useEffect(() => {
    const savedDashboardTheme = getSavedDashboardTheme();
    applyDashboardTheme(savedDashboardTheme);
    window.queueMicrotask(() => setDashboardThemeState(savedDashboardTheme));
  }, []);

  function setDashboardTheme(nextDashboardTheme: DashboardTheme) {
    setDashboardThemeState(nextDashboardTheme);
    applyDashboardTheme(nextDashboardTheme);
    try {
      window.localStorage.setItem(dashboardThemeStorageKey, nextDashboardTheme);
    } catch {
      // Keep the active visual choice for this session when storage is unavailable.
    }
  }

  return { dashboardTheme, dashboardThemeOptions, setDashboardTheme };
}

function applyDashboardTheme(dashboardTheme: DashboardTheme) {
  const root = document.documentElement;
  root.setAttribute("data-dashboard-theme", dashboardTheme);
  root.style.setProperty(
    "--student-dashboard-background",
    dashboardThemeBackgrounds[dashboardTheme],
  );
  root.style.setProperty(
    "--student-dashboard-background-size",
    dashboardTheme === "confetti"
      ? "180px 180px, 230px 230px, 210px 210px, 260px 260px, auto, auto"
      : "auto",
  );
}

function getSavedDashboardTheme(): DashboardTheme {
  const savedTheme = window.localStorage.getItem(dashboardThemeStorageKey);
  return isDashboardTheme(savedTheme) ? savedTheme : defaultDashboardTheme;
}
