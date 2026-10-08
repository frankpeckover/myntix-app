"use client";

import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import {
  walletPatternOptions,
  walletStyleOptions,
  type WalletStyle,
  type WalletPattern,
} from "@/lib/theme/wallet-style-config";

export function useWalletStyle() {
  const { preferences, updatePreferences } = useUserPreferences();

  return {
    setWalletPattern: (walletPattern: WalletPattern) => updatePreferences({ walletPattern }),
    setWalletStyle: (walletStyle: WalletStyle) => updatePreferences({ walletStyle }),
    walletPattern: preferences.walletPattern,
    walletPatternOptions,
    walletStyle: preferences.walletStyle,
    walletStyleOptions,
  };
}
