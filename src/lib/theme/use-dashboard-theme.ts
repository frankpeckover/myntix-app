"use client";

import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import {
  dashboardThemeOptions,
  type DashboardTheme,
} from "@/lib/theme/dashboard-theme-config";

export function useDashboardTheme() {
  const { preferences, updatePreferences } = useUserPreferences();
  return {
    dashboardTheme: preferences.dashboardTheme,
    dashboardThemeOptions,
    setDashboardTheme: (dashboardTheme: DashboardTheme) => updatePreferences({ dashboardTheme }),
  };
}
