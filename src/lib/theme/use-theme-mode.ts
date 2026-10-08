"use client";

import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import type { ThemeMode } from "@/lib/theme/theme-config";

export function useThemeMode() {
  const { preferences, updatePreferences } = useUserPreferences();
  function toggleThemeMode() {
    const nextThemeMode: ThemeMode = preferences.themeMode === "dark" ? "light" : "dark";
    updatePreferences({ themeMode: nextThemeMode });
  }
  return { isDarkMode: preferences.themeMode === "dark", themeMode: preferences.themeMode, toggleThemeMode };
}
