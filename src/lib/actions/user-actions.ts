"use server";

import { isStaff } from "@/lib/auth/permissions";
import { requireAdmin, requireUser } from "@/lib/actions/action-auth";
import type {
  ChangeOwnPasswordInput,
  CreateUserInput,
  ImportUsersInput,
  ResetUserPasswordInput,
  UpdateUserInput,
} from "@/domains/users/user-service";
import { UserService } from "@/domains/users/user-service";

const userService = new UserService();

export async function listUsers() {
  await requireAdmin();
  return userService.listUsers();
}

export async function listStudents() {
  const currentUser = await requireUser();

  if (!isStaff(currentUser)) {
    return [];
  }

  return userService.listStudents();
}

export async function searchStudents(searchTerm: string) {
  const currentUser = await requireUser();

  if (!isStaff(currentUser)) {
    return [];
  }

  return userService.searchStudents(searchTerm);
}

export async function createUser(input: CreateUserInput) {
  const currentUser = await requireAdmin();
  return userService.createUser(input, currentUser);
}

export async function importUsers(input: ImportUsersInput) {
  const currentUser = await requireAdmin();
  return userService.importUsers(input, currentUser);
}

export async function previewImportUsers(input: ImportUsersInput) {
  await requireAdmin();
  return userService.previewImportUsers(input);
}

export async function updateUser(input: UpdateUserInput) {
  const currentUser = await requireAdmin();
  return userService.updateUser(input, currentUser);
}

export async function resetUserPassword(input: ResetUserPasswordInput) {
  const currentUser = await requireAdmin();
  return userService.resetPassword(input, currentUser);
}

export async function changeOwnPassword(input: ChangeOwnPasswordInput) {
  const currentUser = await requireUser();
  return userService.changeOwnPassword(currentUser, input);
}

export async function setUserActive(userId: string, isActive: boolean) {
  const currentUser = await requireAdmin();
  return userService.setUserActive(userId, isActive, currentUser);
}
