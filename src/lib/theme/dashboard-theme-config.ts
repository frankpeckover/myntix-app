export type DashboardTheme = "clean" | "soft-grid" | "notebook" | "confetti";

export type DashboardThemeOption = {
  label: string;
  preview: string;
  value: DashboardTheme;
};

export const defaultDashboardTheme: DashboardTheme = "clean";

export const dashboardThemeBackgrounds: Record<DashboardTheme, string> = {
  clean:
    "linear-gradient(135deg, var(--shell-gradient-accent), transparent 34%), linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--background)",
  confetti:
    "radial-gradient(circle at 8% 14%, color-mix(in srgb, var(--accent-primary) 15%, transparent) 0 2px, transparent 3px), radial-gradient(circle at 24% 42%, color-mix(in srgb, var(--accent-secondary) 17%, transparent) 0 2px, transparent 3px), radial-gradient(circle at 74% 18%, color-mix(in srgb, var(--accent-highlight) 20%, transparent) 0 2px, transparent 3px), radial-gradient(circle at 92% 54%, color-mix(in srgb, var(--accent-primary) 12%, transparent) 0 2px, transparent 3px), linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--background)",
  notebook:
    "repeating-linear-gradient(0deg, transparent 0 35px, color-mix(in srgb, var(--accent-secondary) 10%, transparent) 35px 36px), linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--background)",
  "soft-grid":
    "repeating-linear-gradient(90deg, transparent 0 31px, color-mix(in srgb, var(--accent-primary) 7%, transparent) 31px 32px), repeating-linear-gradient(0deg, transparent 0 31px, color-mix(in srgb, var(--accent-primary) 6%, transparent) 31px 32px), linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--background)",
};

export const dashboardThemeOptions: DashboardThemeOption[] = [
  {
    label: "Clean",
    preview: "linear-gradient(145deg, var(--surface), var(--panel-soft))",
    value: "clean",
  },
  {
    label: "Soft grid",
    preview: "repeating-linear-gradient(90deg, var(--panel-soft) 0 9px, var(--brand-soft) 10px), repeating-linear-gradient(0deg, transparent 0 9px, var(--brand-soft) 10px)",
    value: "soft-grid",
  },
  {
    label: "Notebook",
    preview: "repeating-linear-gradient(0deg, var(--surface) 0 8px, var(--accent-soft) 9px)",
    value: "notebook",
  },
  {
    label: "Confetti",
    preview: "radial-gradient(circle at 20% 30%, var(--brand) 0 2px, transparent 3px), radial-gradient(circle at 70% 65%, var(--accent) 0 2px, transparent 3px), var(--surface)",
    value: "confetti",
  },
];

export function isDashboardTheme(value: string | null): value is DashboardTheme {
  return dashboardThemeOptions.some((option) => option.value === value);
}
