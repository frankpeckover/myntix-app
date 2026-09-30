"use client";

import { useEffect, useState } from "react";
import {
  defaultThemeMode,
  themeStorageKey,
  type ThemeMode,
} from "@/lib/theme/theme-config";
import { syncBrandForeground } from "@/lib/presentation/brand-contrast";

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(defaultThemeMode);

  useEffect(() => {
    const savedThemeMode = getSavedThemeMode();
    applyThemeMode(savedThemeMode);

    window.queueMicrotask(() => {
      setThemeMode(savedThemeMode);
    });
  }, []);

  function toggleThemeMode() {
    setThemeMode((currentThemeMode) => {
      const nextThemeMode =
        currentThemeMode === "dark" ? "light" : "dark";
      saveThemeMode(nextThemeMode);
      applyThemeMode(nextThemeMode);
      return nextThemeMode;
    });
  }

  return {
    isDarkMode: themeMode === "dark",
    themeMode,
    toggleThemeMode,
  };
}

export function applyThemeMode(themeMode: ThemeMode) {
  document.documentElement.dataset.theme = themeMode;
  syncBrandForeground();
}

function getSavedThemeMode(): ThemeMode {
  const savedThemeMode = window.localStorage.getItem(themeStorageKey);

  if (savedThemeMode === "dark" || savedThemeMode === "light") {
    return savedThemeMode;
  }

  return defaultThemeMode;
}

function saveThemeMode(themeMode: ThemeMode) {
  window.localStorage.setItem(themeStorageKey, themeMode);
}
