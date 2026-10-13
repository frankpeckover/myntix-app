import { syncBrandForeground } from "@/lib/presentation/brand-contrast";
import { dashboardThemeBackgrounds } from "@/lib/theme/dashboard-theme-config";
import { walletPatternBackgrounds, walletStyleBackgrounds } from "@/lib/theme/wallet-style-config";
import type { UserPreferences } from "@/lib/theme/user-preferences";

export function applyUserPreferences(preferences: UserPreferences) {
  const root = document.documentElement;
  root.dataset.theme = preferences.themeMode;
  root.dataset.accent = preferences.accentTheme;
  root.dataset.tableDensity = preferences.tableDensity;
  root.dataset.textSize = preferences.textSize;
  root.dataset.dashboardTheme = preferences.dashboardTheme;
  root.dataset.walletStyle = preferences.walletStyle;
  root.dataset.walletPattern = preferences.walletPattern;
  root.style.setProperty("--custom-accent-primary", preferences.customAccentColor);
  root.style.setProperty(
    "--student-dashboard-background",
    dashboardThemeBackgrounds[preferences.dashboardTheme],
  );
  root.style.setProperty(
    "--student-dashboard-background-size",
    preferences.dashboardTheme === "confetti"
      ? "180px 180px, 230px 230px, 210px 210px, 260px 260px, auto, auto"
      : "auto",
  );
  root.style.setProperty(
    "--student-card-background",
    walletStyleBackgrounds[preferences.walletStyle],
  );
  root.style.setProperty(
    "--student-card-pattern",
    walletPatternBackgrounds[preferences.walletPattern],
  );
  root.style.setProperty(
    "--student-card-pattern-size",
    preferences.walletPattern === "dots" ? "18px 18px" : "auto",
  );
  syncBrandForeground();
}
