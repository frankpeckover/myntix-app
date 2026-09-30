"use client";

import { useEffect, useState } from "react";
import {
  defaultWalletStyle,
  defaultWalletPattern,
  isWalletPattern,
  isWalletStyle,
  walletPatternOptions,
  walletPatternStorageKey,
  walletStyleOptions,
  walletStyleStorageKey,
  type WalletStyle,
  type WalletPattern,
} from "@/lib/theme/wallet-style-config";

export function useWalletStyle() {
  const [walletStyle, setWalletStyleState] =
    useState<WalletStyle>(defaultWalletStyle);
  const [walletPattern, setWalletPatternState] =
    useState<WalletPattern>(defaultWalletPattern);

  useEffect(() => {
    const savedWalletStyle = getSavedWalletStyle();
    const savedWalletPattern = getSavedWalletPattern();
    applyWalletStyle(savedWalletStyle);
    applyWalletPattern(savedWalletPattern);
    window.queueMicrotask(() => {
      setWalletStyleState(savedWalletStyle);
      setWalletPatternState(savedWalletPattern);
    });
  }, []);

  function setWalletStyle(nextWalletStyle: WalletStyle) {
    setWalletStyleState(nextWalletStyle);
    window.localStorage.setItem(walletStyleStorageKey, nextWalletStyle);
    applyWalletStyle(nextWalletStyle);
  }

  function setWalletPattern(nextWalletPattern: WalletPattern) {
    setWalletPatternState(nextWalletPattern);
    window.localStorage.setItem(walletPatternStorageKey, nextWalletPattern);
    applyWalletPattern(nextWalletPattern);
  }

  return {
    setWalletPattern,
    setWalletStyle,
    walletPattern,
    walletPatternOptions,
    walletStyle,
    walletStyleOptions,
  };
}

function applyWalletPattern(walletPattern: WalletPattern) {
  document.documentElement.dataset.walletPattern = walletPattern;
}

function applyWalletStyle(walletStyle: WalletStyle) {
  document.documentElement.dataset.walletStyle = walletStyle;
}

function getSavedWalletStyle(): WalletStyle {
  const savedWalletStyle = window.localStorage.getItem(walletStyleStorageKey);
  return isWalletStyle(savedWalletStyle) ? savedWalletStyle : defaultWalletStyle;
}

function getSavedWalletPattern(): WalletPattern {
  const savedWalletPattern = window.localStorage.getItem(walletPatternStorageKey);
  return isWalletPattern(savedWalletPattern)
    ? savedWalletPattern
    : defaultWalletPattern;
}
