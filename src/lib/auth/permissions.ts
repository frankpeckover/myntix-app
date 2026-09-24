import type { Role, SessionUser } from "@/lib/auth/session";

type PermissionUser = Pick<SessionUser, "role">;
const staffRoles: Role[] = ["admin", "teacher"];

export function isAdmin(user: PermissionUser) {
  return user.role === "admin";
}

export function isTeacher(user: PermissionUser) {
  return user.role === "teacher";
}

export function isStudent(user: PermissionUser) {
  return user.role === "student";
}

export function isStaff(user: PermissionUser) {
  return staffRoles.includes(user.role);
}

export function canManageUsers(user: PermissionUser) {
  return isAdmin(user);
}

export function canManageGroups(user: PermissionUser) {
  return isAdmin(user);
}

export function canManageSchoolSettings(user: PermissionUser) {
  return isAdmin(user);
}

export function canViewAuditLog(user: PermissionUser) {
  return isAdmin(user);
}

export function canVoidTransactions(user: PermissionUser) {
  return isAdmin(user);
}

export function canViewAllTransactions(user: PermissionUser) {
  return isStaff(user);
}

export function canViewStudentBalances(user: PermissionUser) {
  return isStaff(user);
}

export function canManageShopItems(user: PermissionUser) {
  return isStaff(user);
}

export function canRequestShopItems(user: PermissionUser) {
  return isStudent(user);
}

export function canApproveShopRequests(user: PermissionUser) {
  return isStaff(user);
}

export function canCreateLedgerAdjustments(user: PermissionUser) {
  return isStaff(user);
}
