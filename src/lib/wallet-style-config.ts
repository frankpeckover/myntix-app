export type WalletStyle = "classic" | "mint" | "graphite";
export type WalletPattern = "none" | "pinstripe" | "grid" | "dots" | "orbit";

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
];

export function isWalletStyle(value: string | null): value is WalletStyle {
  return walletStyleOptions.some((option) => option.value === value);
}

export function isWalletPattern(value: string | null): value is WalletPattern {
  return walletPatternOptions.some((option) => option.value === value);
}
