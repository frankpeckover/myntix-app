"use client";

import { useEffect, useState } from "react";
import {
  defaultWalletStyle,
  defaultWalletPattern,
  isWalletPattern,
  isWalletStyle,
  walletPatternOptions,
  walletPatternStorageKey,
  walletPatternBackgrounds,
  walletStyleOptions,
  walletStyleStorageKey,
  walletStyleBackgrounds,
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
    applyWalletStyle(nextWalletStyle);
    savePreference(walletStyleStorageKey, nextWalletStyle);
  }

  function setWalletPattern(nextWalletPattern: WalletPattern) {
    setWalletPatternState(nextWalletPattern);
    applyWalletPattern(nextWalletPattern);
    savePreference(walletPatternStorageKey, nextWalletPattern);
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
  const root = document.documentElement;
  root.setAttribute("data-wallet-pattern", walletPattern);
  root.style.setProperty(
    "--student-card-pattern",
    walletPatternBackgrounds[walletPattern],
  );
  root.style.setProperty(
    "--student-card-pattern-size",
    walletPattern === "dots" ? "18px 18px" : "auto",
  );
}

function applyWalletStyle(walletStyle: WalletStyle) {
  const root = document.documentElement;
  root.setAttribute("data-wallet-style", walletStyle);
  root.style.setProperty(
    "--student-card-background",
    walletStyleBackgrounds[walletStyle],
  );
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

function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the active visual choice for this session when storage is unavailable.
  }
}
