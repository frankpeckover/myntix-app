export type DashboardTheme = "clean" | "plain" | "soft-grid" | "notebook" | "confetti" | "diagonal" | "dot-grid";

export type DashboardThemeOption = {
  label: string;
  previewImage: string;
  previewColor?: string;
  previewSize?: string;
  value: DashboardTheme;
};

export const defaultDashboardTheme: DashboardTheme = "clean";

const patternedCanvas = "linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--dashboard-canvas)";

function gridPattern(cellSize: number) {
  return `repeating-linear-gradient(90deg, transparent 0 ${cellSize - 1}px, var(--dashboard-pattern-line) ${cellSize - 1}px ${cellSize}px), repeating-linear-gradient(0deg, transparent 0 ${cellSize - 1}px, var(--dashboard-pattern-line) ${cellSize - 1}px ${cellSize}px)`;
}

function notebookPattern(lineSpacing: number) {
  return `repeating-linear-gradient(0deg, transparent 0 ${lineSpacing - 1}px, var(--dashboard-pattern-line) ${lineSpacing - 1}px ${lineSpacing}px)`;
}

function diagonalPattern(lineSpacing: number) {
  return `repeating-linear-gradient(135deg, transparent 0 ${lineSpacing - 1}px, var(--dashboard-pattern-line) ${lineSpacing - 1}px ${lineSpacing}px)`;
}

const dotGridPattern = "radial-gradient(circle, var(--dashboard-pattern-dot) 0 1px, transparent 1.5px)";

export const dashboardThemeBackgrounds: Record<DashboardTheme, string> = {
  clean:
    "linear-gradient(135deg, var(--shell-gradient-accent), transparent 34%), linear-gradient(180deg, var(--shell-gradient-surface), transparent 18rem), var(--background)",
  plain: "var(--background)",
  diagonal: `${diagonalPattern(48)}, ${patternedCanvas}`,
  "dot-grid": `${dotGridPattern}, ${patternedCanvas}`,
  confetti:
    `radial-gradient(circle at 8% 14%, var(--dashboard-pattern-dot) 0 2px, transparent 3px), radial-gradient(circle at 24% 42%, var(--dashboard-pattern-dot) 0 2px, transparent 3px), radial-gradient(circle at 74% 18%, var(--dashboard-pattern-dot) 0 2px, transparent 3px), radial-gradient(circle at 92% 54%, var(--dashboard-pattern-dot) 0 2px, transparent 3px), ${patternedCanvas}`,
  notebook:
    `${notebookPattern(48)}, ${patternedCanvas}`,
  "soft-grid":
    `${gridPattern(48)}, ${patternedCanvas}`,
};

export const dashboardThemeBackgroundSizes: Partial<Record<DashboardTheme, string>> = {
  confetti: "240px 240px, 290px 290px, 270px 270px, 320px 320px, auto, auto",
  "dot-grid": "28px 28px, auto, auto",
};

export const dashboardThemeOptions: DashboardThemeOption[] = [
  {
    label: "Corner glow",
    previewImage: "linear-gradient(145deg, var(--surface), var(--dashboard-canvas))",
    value: "clean",
  },
  {
    label: "Plain",
    previewImage: "none",
    previewColor: "var(--background)",
    value: "plain",
  },
  {
    label: "Soft grid",
    previewImage: gridPattern(10),
    value: "soft-grid",
  },
  {
    label: "Notebook",
    previewImage: notebookPattern(9),
    value: "notebook",
  },
  {
    label: "Diagonal",
    previewImage: diagonalPattern(12),
    value: "diagonal",
  },
  {
    label: "Dot grid",
    previewImage: dotGridPattern,
    previewSize: "12px 12px",
    value: "dot-grid",
  },
  {
    label: "Confetti",
    previewImage: "radial-gradient(circle at 20% 30%, var(--dashboard-pattern-dot) 0 2px, transparent 3px), radial-gradient(circle at 70% 65%, var(--dashboard-pattern-dot) 0 2px, transparent 3px)",
    value: "confetti",
  },
];

export function isDashboardTheme(value: string | null): value is DashboardTheme {
  return dashboardThemeOptions.some((option) => option.value === value);
}
