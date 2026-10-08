"use client";

import { useState } from "react";
import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import {
  accentThemeOptions,
  defaultCustomAccentColor,
  type AccentTheme,
} from "@/lib/theme/accent-theme-config";

export function useAccentTheme() {
  const { preferences, updatePreferences } = useUserPreferences();
  const [customAccentDraft, setCustomAccentDraft] = useState(preferences.customAccentColor);

  function setAccentTheme(nextAccentTheme: AccentTheme) {
    updatePreferences({ accentTheme: nextAccentTheme });
  }

  function setCustomAccentColor(nextCustomAccentColor: string) {
    setCustomAccentDraft(nextCustomAccentColor);
    if (/^#[0-9a-f]{6}$/i.test(nextCustomAccentColor)) {
      updatePreferences({ accentTheme: "custom", customAccentColor: nextCustomAccentColor });
    }
  }

  return {
    accentTheme: preferences.accentTheme,
    accentThemeOptions,
    customAccentColor: customAccentDraft || defaultCustomAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  };
}
