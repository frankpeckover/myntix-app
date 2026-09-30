import type { Role } from "@/lib/auth/session";

export const userRoles: Role[] = ["admin", "teacher", "student"];

export type UserFilters = {
  firstName: string;
  lastName: string;
  lastActivity: "" | "active" | "never";
  username: string;
  email: string;
  role: "" | Role;
};

export const emptyFilters: UserFilters = {
  firstName: "",
  lastName: "",
  lastActivity: "",
  username: "",
  email: "",
  role: "",
};
