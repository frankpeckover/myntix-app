import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/database/db";
import {
  defaultUserPreferences,
  normaliseUserPreferences,
  validateUserPreferencePatch,
  type UserPreferences,
} from "@/lib/theme/user-preferences";

type UserPreferenceRow = { preferences: unknown };

export class UserPreferenceService {
  async getPreferences(user: SessionUser): Promise<UserPreferences> {
    try {
      const result = await db.query<UserPreferenceRow>(
        "select preferences from user_preferences where user_id = $1",
        [user.id],
      );

      return normaliseUserPreferences(result.rows[0]?.preferences);
    } catch (error) {
      if (isMissingTableError(error)) return defaultUserPreferences;
      throw error;
    }
  }

  async updatePreferences(user: SessionUser, input: unknown) {
    const patch = validateUserPreferencePatch(input);

    await db.query(
      `
        insert into user_preferences (user_id, preferences)
        values ($1, $2::jsonb)
        on conflict (user_id) do update
        set preferences = user_preferences.preferences || excluded.preferences,
            updated_at = now()
      `,
      [user.id, JSON.stringify(patch)],
    );

    return { ok: true as const };
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
