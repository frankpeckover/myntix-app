"use client";

import { useEffect, useState } from "react";
import {
  accentThemeOptions,
  accentThemeStorageKey,
  customAccentColorStorageKey,
  defaultCustomAccentColor,
  defaultAccentTheme,
  type AccentTheme,
} from "@/lib/theme/accent-theme-config";
import { syncBrandForeground } from "@/lib/presentation/brand-contrast";

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function useAccentTheme() {
  const [accentTheme, setAccentThemeState] =
    useState<AccentTheme>(defaultAccentTheme);
  const [customAccentColor, setCustomAccentColorState] = useState(
    defaultCustomAccentColor,
  );

  useEffect(() => {
    const savedAccentTheme = getSavedAccentTheme();
    const savedCustomAccentColor = getSavedCustomAccentColor();

    applyAccentTheme(savedAccentTheme, savedCustomAccentColor);

    window.queueMicrotask(() => {
      setAccentThemeState(savedAccentTheme);
      setCustomAccentColorState(savedCustomAccentColor);
    });
  }, []);

  function setAccentTheme(nextAccentTheme: AccentTheme) {
    setAccentThemeState(nextAccentTheme);
    saveAccentTheme(nextAccentTheme);
    applyAccentTheme(nextAccentTheme, customAccentColor);
  }

  function setCustomAccentColor(nextCustomAccentColor: string) {
    setCustomAccentColorState(nextCustomAccentColor);

    if (!hexColorPattern.test(nextCustomAccentColor)) {
      return;
    }

    saveCustomAccentColor(nextCustomAccentColor);
    setAccentThemeState("custom");
    saveAccentTheme("custom");
    applyAccentTheme("custom", nextCustomAccentColor);
  }

  return {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  };
}

export function applyAccentTheme(
  accentTheme: AccentTheme,
  customAccentColor = defaultCustomAccentColor,
) {
  document.documentElement.dataset.accent = accentTheme;
  document.documentElement.style.setProperty(
    "--custom-accent-primary",
    customAccentColor,
  );
  syncBrandForeground();
}

function getSavedAccentTheme(): AccentTheme {
  const savedAccentTheme = window.localStorage.getItem(accentThemeStorageKey);

  if (isAccentTheme(savedAccentTheme)) {
    return savedAccentTheme;
  }

  return defaultAccentTheme;
}

function saveAccentTheme(accentTheme: AccentTheme) {
  window.localStorage.setItem(accentThemeStorageKey, accentTheme);
}

function getSavedCustomAccentColor() {
  const savedCustomAccentColor = window.localStorage.getItem(
    customAccentColorStorageKey,
  );

  if (hexColorPattern.test(savedCustomAccentColor ?? "")) {
    return savedCustomAccentColor ?? defaultCustomAccentColor;
  }

  return defaultCustomAccentColor;
}

function saveCustomAccentColor(customAccentColor: string) {
  window.localStorage.setItem(customAccentColorStorageKey, customAccentColor);
}

function isAccentTheme(value: string | null): value is AccentTheme {
  return accentThemeOptions.some((option) => option.value === value);
}
