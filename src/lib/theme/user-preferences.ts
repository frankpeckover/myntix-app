import {
  defaultAccentTheme,
  defaultCustomAccentColor,
  type AccentTheme,
} from "@/lib/theme/accent-theme-config";
import {
  defaultDashboardTheme,
  dashboardThemeOptions,
  type DashboardTheme,
} from "@/lib/theme/dashboard-theme-config";
import {
  defaultTableDensity,
  type TableDensity,
} from "@/lib/theme/table-density-config";
import { defaultThemeMode, type ThemeMode } from "@/lib/theme/theme-config";
import {
  defaultWalletPattern,
  defaultWalletStyle,
  type WalletPattern,
  type WalletStyle,
} from "@/lib/theme/wallet-style-config";

export type VoiceShortcut = "F2" | "F8" | "Control+Shift+Space" | "click";
export type TextSize = "small" | "default" | "large";

export type UserPreferences = {
  accentTheme: AccentTheme;
  customAccentColor: string;
  dashboardTheme: DashboardTheme;
  tableDensity: TableDensity;
  textSize: TextSize;
  themeMode: ThemeMode;
  voiceShortcut: VoiceShortcut;
  walletPattern: WalletPattern;
  walletStyle: WalletStyle;
};

export const defaultUserPreferences: UserPreferences = {
  accentTheme: defaultAccentTheme,
  customAccentColor: defaultCustomAccentColor,
  dashboardTheme: defaultDashboardTheme,
  tableDensity: defaultTableDensity,
  textSize: "default",
  themeMode: defaultThemeMode,
  voiceShortcut: "F2",
  walletPattern: defaultWalletPattern,
  walletStyle: defaultWalletStyle,
};

const allowedValues = {
  accentTheme: ["teal", "blue", "purple", "orange", "custom"],
  dashboardTheme: dashboardThemeOptions.map((option) => option.value),
  tableDensity: ["compact", "default", "roomy"],
  textSize: ["small", "default", "large"],
  themeMode: ["light", "dark"],
  voiceShortcut: ["F2", "F8", "Control+Shift+Space", "click"],
  walletPattern: ["none", "pinstripe", "grid", "dots", "orbit", "contour"],
  walletStyle: ["classic", "mint", "graphite", "accent", "ocean", "berry"],
} as const;

export function normaliseUserPreferences(value: unknown): UserPreferences {
  const source = isRecord(value) ? value : {};
  const preferences = { ...defaultUserPreferences };

  for (const key of Object.keys(allowedValues) as Array<keyof typeof allowedValues>) {
    const candidate = source[key];
    if (typeof candidate === "string" && allowedValues[key].includes(candidate as never)) {
      Object.assign(preferences, { [key]: candidate });
    }
  }

  if (
    typeof source.customAccentColor === "string" &&
    /^#[0-9a-f]{6}$/i.test(source.customAccentColor)
  ) {
    preferences.customAccentColor = source.customAccentColor;
  }

  return preferences;
}

export function validateUserPreferencePatch(value: unknown): Partial<UserPreferences> {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new Error("Choose at least one preference to save.");
  }

  const normalised = normaliseUserPreferences(value);
  const patch: Partial<UserPreferences> = {};

  for (const key of Object.keys(value)) {
    if (!(key in defaultUserPreferences)) {
      throw new Error("One or more preferences are not supported.");
    }

    const preferenceKey = key as keyof UserPreferences;
    const rawValue = value[preferenceKey];
    if (preferenceKey === "customAccentColor") {
      if (typeof rawValue !== "string" || !/^#[0-9a-f]{6}$/i.test(rawValue)) {
        throw new Error("Enter a valid six-digit hex colour.");
      }
    } else if (normalised[preferenceKey] !== rawValue) {
      throw new Error("One or more preference values are not supported.");
    }

    Object.assign(patch, { [preferenceKey]: rawValue });
  }

  return patch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
