"use client";

import { useState } from "react";
import { StaffSettingsPanel } from "@/components/preferences/staff-settings-panel";
import { PageHeader } from "@/components/ui/page-header";
import {
  MoonIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "@/components/ui/icons";
import { defaultCustomAccentColor, type AccentTheme } from "@/lib/theme/accent-theme-config";
import { isStaff, isStudent } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { useAccentTheme } from "@/lib/theme/use-accent-theme";
import { useDashboardTheme } from "@/lib/theme/use-dashboard-theme";
import { useThemeMode } from "@/lib/theme/use-theme-mode";
import { useWalletStyle } from "@/lib/theme/use-wallet-style";
import { useTableDensity } from "@/lib/theme/use-table-density";
import {
  walletPatternBackgrounds,
  walletStyleBackgrounds,
} from "@/lib/theme/wallet-style-config";

type PreferencesPanelProps = {
  user: SessionUser;
};

export function PreferencesPanel({ user }: PreferencesPanelProps) {
  return (
    <section className="motion-panel mt-2 space-y-5">
      <PageHeader
        description="Manage the appearance and personal workflow choices for your account."
        icon={<SlidersHorizontalIcon />}
        title="Preferences"
      />
      <AppearancePreferences showWalletOptions={isStudent(user)} />
      {isStaff(user) && <StaffSettingsPanel />}
    </section>
  );
}

function AppearancePreferences({
  showWalletOptions,
}: {
  showWalletOptions: boolean;
}) {
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();
  const { setTableDensity, tableDensity, tableDensityOptions } =
    useTableDensity();
  const [isCustomColorPickerOpen, setIsCustomColorPickerOpen] =
    useState(false);

  function handleAccentThemeChange(nextAccentTheme: AccentTheme) {
    if (nextAccentTheme === "custom") {
      setIsCustomColorPickerOpen((currentValue) => !currentValue);
      setAccentTheme("custom");
      return;
    }

    setIsCustomColorPickerOpen(false);
    setAccentTheme(nextAccentTheme);
  }

  return (
    <section className="theme-panel p-5">
      <div>
        <h2 className="text-sm font-semibold text-text-control">Appearance</h2>
        <p className="mt-1 text-sm text-text-muted">
          These choices apply only to this browser.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-panel-soft text-text-muted">
            {isDarkMode ? <MoonIcon /> : <SunIcon />}
          </span>
          <div>
            <p className="text-sm font-medium text-text-control">Dark theme</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Use a darker interface in this browser.
            </p>
          </div>
        </div>
        <button
          aria-checked={isDarkMode}
          aria-label="Dark theme"
          className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
            isDarkMode
              ? "border-brand bg-brand"
              : "border-border-strong bg-surface-hover"
          }`}
          onClick={toggleThemeMode}
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-[1px] h-5 w-5 rounded-full border border-border-strong bg-white shadow-sm transition ${
              isDarkMode ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="text-sm font-medium text-text-control">Table density</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Choose how much vertical space data rows use.
        </p>
        <div className="mt-3 grid grid-cols-3 rounded-md border border-border bg-surface p-1">
          {tableDensityOptions.map((option) => (
            <button
              aria-pressed={tableDensity === option.value}
              className={`min-w-0 rounded-sm px-2 py-2 text-sm font-semibold transition ${
                tableDensity === option.value
                  ? "bg-brand text-white"
                  : "text-text-control hover:bg-surface-hover"
              }`}
              key={option.value}
              onClick={() => setTableDensity(option.value)}
              title={option.description}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="text-sm font-medium text-text-control">Accent colour</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Choose the colour used for active controls and highlights.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {accentThemeOptions.map((option) => (
            <div className="relative" key={option.value}>
              <button
                aria-expanded={
                  option.value === "custom"
                    ? isCustomColorPickerOpen
                    : undefined
                }
                aria-label={`${option.label} accent`}
                aria-pressed={accentTheme === option.value}
                className={`h-8 w-8 rounded-full border transition hover:scale-105 ${
                  accentTheme === option.value
                    ? "border-foreground ring-1 ring-foreground ring-offset-1 ring-offset-surface"
                    : "border-border-subtle"
                }`}
                onClick={() => handleAccentThemeChange(option.value)}
                style={{
                  background:
                    option.value === "custom"
                      ? "conic-gradient(from 45deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)"
                      : option.swatch,
                }}
                title={option.label}
                type="button"
              />
              {option.value === "custom" && isCustomColorPickerOpen && (
                <div className="motion-pop absolute left-0 top-10 z-30 w-44 border border-border bg-surface p-3 shadow-lg">
                  <label className="block text-xs font-light text-text-muted">
                    Custom colour
                    <input
                      aria-label="Custom accent colour"
                      className="color-swatch-input mt-2 h-9 w-full cursor-pointer rounded-md border border-border bg-transparent p-0"
                      onChange={(event) =>
                        setCustomAccentColor(event.target.value)
                      }
                      type="color"
                      value={getColorInputValue(customAccentColor)}
                    />
                  </label>
                  <input
                    aria-label="Custom accent hex"
                    className="mt-2 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-light uppercase text-text-control outline-none ring-brand transition placeholder:text-text-muted focus:border-brand focus:ring-2"
                    maxLength={7}
                    onChange={(event) =>
                      setCustomAccentColor(event.target.value)
                    }
                    placeholder="#7AE4B7"
                    value={customAccentColor}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showWalletOptions && <WalletAppearancePreferences />}
    </section>
  );
}

function WalletAppearancePreferences() {
  const {
    setWalletPattern,
    setWalletStyle,
    walletPattern,
    walletPatternOptions,
    walletStyle,
    walletStyleOptions,
  } = useWalletStyle();
  const { dashboardTheme, dashboardThemeOptions, setDashboardTheme } =
    useDashboardTheme();

  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <p className="text-sm font-medium text-text-control">Wallet appearance</p>
      <p className="mt-0.5 text-xs text-text-muted">
        Personalise the balance card on your dashboard.
      </p>
      <p className="mt-4 text-xs font-medium uppercase text-text-muted">Finish</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {walletStyleOptions.map((option) => (
          <button
            aria-label={`${option.label} wallet`}
            aria-pressed={walletStyle === option.value}
            className={`group flex min-h-18 min-w-0 flex-col gap-1.5 rounded-md border bg-surface p-1.5 text-left transition hover:border-border-strong ${
              walletStyle === option.value
                ? "border-foreground ring-2 ring-brand-soft-strong"
                : "border-border-subtle"
            }`}
            key={option.value}
            onClick={() => setWalletStyle(option.value)}
            title={option.label}
            type="button"
          >
            <span className="h-9 w-full shrink-0 rounded-sm" style={{ background: option.preview }} />
            <span className="truncate px-0.5 text-xs text-text-control">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs font-medium uppercase text-text-muted">Pattern</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {walletPatternOptions.map((option) => (
          <button
            aria-label={`${option.label} wallet pattern`}
            aria-pressed={walletPattern === option.value}
            className={`flex min-h-18 min-w-0 flex-col gap-1.5 rounded-md border bg-surface p-1.5 text-left transition hover:border-border-strong ${
              walletPattern === option.value
                ? "border-foreground ring-2 ring-brand-soft-strong"
                : "border-border-subtle"
            }`}
            key={option.value}
            onClick={() => setWalletPattern(option.value)}
            title={option.label}
            type="button"
          >
            <span
              className="h-9 w-full shrink-0 rounded-sm"
              style={{
                background:
                  option.value === "none"
                    ? walletStyleBackgrounds[walletStyle]
                    : `${walletPatternBackgrounds[option.value]}, ${walletStyleBackgrounds[walletStyle]}`,
                backgroundSize: option.value === "dots" ? "18px 18px, auto" : "auto",
              }}
            />
            <span className="truncate px-0.5 text-xs text-text-control">{option.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-medium text-text-control">Dashboard background</p>
      <p className="mt-0.5 text-xs text-text-muted">
        Add a subtle pattern behind your dashboard cards.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dashboardThemeOptions.map((option) => (
          <button
            aria-label={`${option.label} dashboard background`}
            aria-pressed={dashboardTheme === option.value}
            className={`flex min-h-22 min-w-0 flex-col gap-2 rounded-md border bg-surface p-2 text-left transition hover:border-border-strong ${
              dashboardTheme === option.value
                ? "border-foreground ring-2 ring-brand-soft-strong"
                : "border-border-subtle"
            }`}
            key={option.value}
            onClick={() => setDashboardTheme(option.value)}
            type="button"
          >
            <span
              className="h-12 w-full shrink-0 rounded-sm border border-border-muted bg-[length:12px_12px]"
              style={{ background: option.preview }}
            />
            <span className="truncate text-xs text-text-control">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getColorInputValue(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : defaultCustomAccentColor;
}
