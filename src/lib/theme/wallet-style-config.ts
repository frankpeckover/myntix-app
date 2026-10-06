export type WalletStyle =
  | "classic"
  | "mint"
  | "graphite"
  | "accent"
  | "ocean"
  | "berry";
export type WalletPattern =
  | "none"
  | "pinstripe"
  | "grid"
  | "dots"
  | "orbit"
  | "contour";

export type WalletStyleOption = {
  label: string;
  preview: string;
  value: WalletStyle;
};

export type WalletPatternOption = {
  label: string;
  preview: string;
  value: WalletPattern;
};

export const walletStyleStorageKey = "app-wallet-style";
export const walletPatternStorageKey = "app-wallet-pattern";
export const defaultWalletStyle: WalletStyle = "classic";
export const defaultWalletPattern: WalletPattern = "none";

export const walletStyleBackgrounds: Record<WalletStyle, string> = {
  accent:
    "linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 88%, #102a2d), color-mix(in srgb, var(--accent-secondary) 72%, #173b40))",
  berry:
    "radial-gradient(circle at 86% 18%, color-mix(in srgb, var(--accent-highlight) 16%, transparent) 0%, transparent 28%), linear-gradient(135deg, #36243f 0%, #553651 56%, #875878 100%)",
  classic:
    "radial-gradient(circle at 88% 18%, rgba(122, 228, 183, 0.2) 0%, transparent 28%), radial-gradient(circle at 8% 108%, rgba(112, 184, 149, 0.16) 0%, transparent 34%), linear-gradient(112deg, var(--balance-bg) 0%, color-mix(in srgb, var(--balance-bg) 94%, var(--accent-primary)) 58%, color-mix(in srgb, var(--balance-bg) 82%, var(--accent-primary)) 100%)",
  graphite:
    "radial-gradient(circle at 88% 12%, rgba(122, 228, 183, 0.12) 0%, transparent 28%), linear-gradient(135deg, #1b2226 0%, #293238 58%, #414d52 100%)",
  mint:
    "radial-gradient(circle at 86% 16%, rgba(122, 228, 183, 0.28) 0%, transparent 30%), linear-gradient(135deg, #123a36 0%, #205f51 58%, #478b70 100%)",
  ocean:
    "radial-gradient(circle at 84% 18%, rgba(122, 228, 183, 0.16) 0%, transparent 30%), linear-gradient(135deg, #123b52 0%, #175465 52%, #247b7b 100%)",
};

export const walletPatternBackgrounds: Record<WalletPattern, string> = {
  contour:
    "repeating-radial-gradient(ellipse at 12% 112%, transparent 0 24px, color-mix(in srgb, var(--accent-highlight) 22%, transparent) 25px 26px)",
  dots:
    "radial-gradient(circle, color-mix(in srgb, var(--accent-highlight) 34%, transparent) 0 1.5px, transparent 1.5px)",
  grid:
    "repeating-linear-gradient(90deg, transparent 0 27px, color-mix(in srgb, var(--accent-highlight) 18%, transparent) 27px 28px), repeating-linear-gradient(0deg, transparent 0 27px, color-mix(in srgb, var(--accent-highlight) 14%, transparent) 27px 28px)",
  none: "none",
  orbit:
    "radial-gradient(circle at 88% 24%, transparent 0 34px, color-mix(in srgb, var(--accent-highlight) 28%, transparent) 35px 36px, transparent 37px 59px, color-mix(in srgb, var(--accent-primary) 28%, transparent) 60px 61px, transparent 62px), radial-gradient(circle at 8% 108%, transparent 0 46px, color-mix(in srgb, var(--accent-highlight) 20%, transparent) 47px 48px, transparent 49px)",
  pinstripe:
    "repeating-linear-gradient(120deg, transparent 0 14px, color-mix(in srgb, var(--accent-primary) 34%, transparent) 14px 15px)",
};

export const walletStyleOptions: WalletStyleOption[] = [
  {
    label: "Classic",
    preview: "linear-gradient(135deg, #173b40, #245c57)",
    value: "classic",
  },
  {
    label: "Mint",
    preview: "linear-gradient(135deg, #16443d, #4f9c7d)",
    value: "mint",
  },
  {
    label: "Graphite",
    preview: "linear-gradient(135deg, #20262a, #465158)",
    value: "graphite",
  },
  {
    label: "Accent",
    preview: "linear-gradient(135deg, var(--brand), var(--accent))",
    value: "accent",
  },
  {
    label: "Ocean",
    preview: "linear-gradient(135deg, #123b52, #247b7b)",
    value: "ocean",
  },
  {
    label: "Berry",
    preview: "linear-gradient(135deg, #432c4f, #875878)",
    value: "berry",
  },
];

export const walletPatternOptions: WalletPatternOption[] = [
  {
    label: "Clean",
    preview: "linear-gradient(135deg, var(--brand), var(--accent))",
    value: "none",
  },
  {
    label: "Pinstripe",
    preview: "repeating-linear-gradient(120deg, var(--brand) 0 5px, var(--accent) 6px 7px)",
    value: "pinstripe",
  },
  {
    label: "Grid",
    preview: "repeating-linear-gradient(90deg, transparent 0 7px, var(--accent) 8px), repeating-linear-gradient(0deg, var(--brand) 0 7px, var(--accent) 8px)",
    value: "grid",
  },
  {
    label: "Dots",
    preview: "radial-gradient(circle, var(--accent) 1px, var(--brand) 2px)",
    value: "dots",
  },
  {
    label: "Orbit",
    preview: "radial-gradient(circle at 70% 30%, transparent 0 5px, var(--accent) 6px 7px, var(--brand) 8px)",
    value: "orbit",
  },
  {
    label: "Contour",
    preview: "repeating-radial-gradient(ellipse at 20% 100%, transparent 0 5px, var(--accent) 6px 7px)",
    value: "contour",
  },
];

export function isWalletStyle(value: string | null): value is WalletStyle {
  return walletStyleOptions.some((option) => option.value === value);
}

export function isWalletPattern(value: string | null): value is WalletPattern {
  return walletPatternOptions.some((option) => option.value === value);
}
