export type Role = "teacher" | "student" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  role: Role;
  yearLevel: number | null;
};
