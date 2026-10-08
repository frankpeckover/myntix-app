"use server";

import { UserPreferenceService } from "@/domains/users/user-preference-service";
import { requireUser } from "@/lib/actions/action-auth";

const userPreferenceService = new UserPreferenceService();

export async function getMyUserPreferences() {
  const currentUser = await requireUser();
  return userPreferenceService.getPreferences(currentUser);
}

export async function updateMyUserPreferences(input: unknown) {
  const currentUser = await requireUser();

  try {
    return await userPreferenceService.updatePreferences(currentUser, input);
  } catch (error) {
    console.error("Update user preferences failed", error);
    return {
      ok: false as const,
      message:
        isMissingTableError(error)
          ? "Account preferences are unavailable. Apply the latest tenant database update."
          : error instanceof Error
            ? error.message
            : "Could not save your account preferences.",
    };
  }
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  );
}
