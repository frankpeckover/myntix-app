"use client";

import { useUserPreferences } from "@/components/preferences/user-preferences-provider";
import {
  tableDensityOptions,
  type TableDensity,
} from "@/lib/theme/table-density-config";

export function useTableDensity() {
  const { preferences, updatePreferences } = useUserPreferences();
  return {
    setTableDensity: (tableDensity: TableDensity) => updatePreferences({ tableDensity }),
    tableDensity: preferences.tableDensity,
    tableDensityOptions,
  };
}
