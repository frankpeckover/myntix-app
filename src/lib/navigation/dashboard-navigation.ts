import type { Role } from "@/lib/auth/session";

const staffNavigationItems = [
  "Dashboard", "Credit Management", "Reward Requests", "Timetable",
  "Analytics", "Rewards", "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Rewards", "Transaction History"] as const;
const adminNavigationItems = [
  "Dashboard", "Credit Management", "Reward Requests", "Users", "Groups",
  "Timetable", "Analytics", "Rewards", "Transaction Log", "Audit Log",
  "Error Log", "Settings",
] as const;

export type NavigationItem =
  | (typeof adminNavigationItems)[number]
  | (typeof studentNavigationItems)[number]
  | "Preferences"
  | "Help";

export const dashboardPageSlugs: Record<NavigationItem, string> = {
  Dashboard: "dashboard",
  "Credit Management": "credit-management",
  "Reward Requests": "reward-requests",
  Users: "users",
  Groups: "groups",
  Timetable: "timetable",
  Analytics: "analytics",
  Rewards: "rewards",
  "Transaction Log": "transaction-log",
  "Transaction History": "transaction-history",
  "Audit Log": "audit-log",
  "Error Log": "error-log",
  Settings: "settings",
  Preferences: "preferences",
  Help: "help",
};

export function getPrimaryNavigationItems(role: Role): readonly NavigationItem[] {
  if (role === "admin") return adminNavigationItems;
  if (role === "student") return studentNavigationItems;
  return staffNavigationItems;
}

function isAllowedNavigationItem(item: NavigationItem, role: Role) {
  return item === "Preferences" || item === "Help" || getPrimaryNavigationItems(role).includes(item);
}

export function getDashboardNavigation(
  params: { get: (name: string) => string | null },
  role: Role,
) {
  const requestedPage = params.get("page");
  const requestedItem = (Object.keys(dashboardPageSlugs) as NavigationItem[])
    .find((item) => dashboardPageSlugs[item] === requestedPage);
  const activeItem = requestedItem && isAllowedNavigationItem(requestedItem, role)
    ? requestedItem : "Dashboard";
  return {
    activeItem,
    transactionDateFilter: activeItem === "Transaction History"
      ? getValidHistoryDate(params.get("date")) : null,
  };
}

export function getDashboardNavigationUrl(
  currentUrl: URL,
  target: NavigationItem,
  role: Role,
  date?: string | null,
) {
  const url = new URL(currentUrl);
  const activeItem = isAllowedNavigationItem(target, role) ? target : "Dashboard";
  url.searchParams.set("page", dashboardPageSlugs[activeItem]);
  const validDate = activeItem === "Transaction History" ? getValidHistoryDate(date) : null;
  if (validDate) url.searchParams.set("date", validDate);
  else url.searchParams.delete("date");
  return `${url.pathname}${url.search}${url.hash}`;
}

function getValidHistoryDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? value : null;
}
