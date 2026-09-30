import type { UserListItem } from "@/domains/users/user-service";
import type { UserFilters } from "@/components/admin/users/user-management-types";

export function matchesUserFilters(
  user: UserListItem,
  filters: UserFilters,
  showInactiveUsers: boolean,
) {
  if (!showInactiveUsers && !user.isActive) {
    return false;
  }

  return (
    includesFilter(user.firstName, filters.firstName) &&
    includesFilter(user.lastName, filters.lastName) &&
    includesAnyFilter([user.username, user.cardNumber], filters.username) &&
    includesFilter(user.email, filters.email) &&
    matchesLastActivityFilter(user.lastActivityAt, filters.lastActivity) &&
    (!filters.role || user.role === filters.role)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function includesAnyFilter(values: string[], filter: string) {
  return values.some((value) => includesFilter(value, filter));
}

function matchesLastActivityFilter(
  lastActivityAt: string | null,
  filter: UserFilters["lastActivity"],
) {
  if (filter === "active") {
    return Boolean(lastActivityAt);
  }

  if (filter === "never") {
    return !lastActivityAt;
  }

  return true;
}
