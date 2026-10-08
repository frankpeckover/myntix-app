"use client";

import { useEffect, useState } from "react";
import {
  defaultTableDensity,
  isTableDensity,
  tableDensityOptions,
  tableDensityStorageKey,
  type TableDensity,
} from "@/lib/theme/table-density-config";

export function useTableDensity() {
  const [tableDensity, setTableDensityState] =
    useState<TableDensity>(defaultTableDensity);

  useEffect(() => {
    const savedDensity = getSavedTableDensity();
    applyTableDensity(savedDensity);
    window.queueMicrotask(() => setTableDensityState(savedDensity));
  }, []);

  function setTableDensity(nextDensity: TableDensity) {
    setTableDensityState(nextDensity);
    applyTableDensity(nextDensity);
    try {
      window.localStorage.setItem(tableDensityStorageKey, nextDensity);
    } catch {
      // Keep the active choice for this session when storage is unavailable.
    }
  }

  return { setTableDensity, tableDensity, tableDensityOptions };
}

function applyTableDensity(tableDensity: TableDensity) {
  document.documentElement.dataset.tableDensity = tableDensity;
}

function getSavedTableDensity() {
  const savedDensity = window.localStorage.getItem(tableDensityStorageKey);
  return isTableDensity(savedDensity) ? savedDensity : defaultTableDensity;
}
