"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Role } from "@/lib/auth/session";
import {
  dashboardPageSlugs,
  getDashboardNavigation,
  getDashboardNavigationUrl,
  type NavigationItem,
} from "@/lib/navigation/dashboard-navigation";

export function useDashboardNavigation(role: Role) {
  const params = useSearchParams();
  const { activeItem, transactionDateFilter } = getDashboardNavigation(params, role);

  useEffect(() => {
    const requestedPage = params.get("page");
    if (
      (requestedPage !== null && requestedPage !== dashboardPageSlugs[activeItem]) ||
      (params.has("date") && params.get("date") !== transactionDateFilter)
    ) {
      window.history.replaceState(null, "", getDashboardNavigationUrl(
        new URL(window.location.href), activeItem, role, transactionDateFilter,
      ));
    }
  }, [activeItem, params, role, transactionDateFilter]);

  const navigateTo = useCallback((target: NavigationItem, date?: string) => {
    const url = getDashboardNavigationUrl(new URL(window.location.href), target, role, date);
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      // Next.js integrates native history changes with useSearchParams without a server navigation.
      window.history.pushState(null, "", url);
    }
  }, [role]);

  return { activeItem, navigateTo, transactionDateFilter };
}
