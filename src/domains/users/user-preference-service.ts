import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/database/db";
import {
  getPresetAvatarUrl,
  presetAvatarUrls,
} from "@/lib/theme/avatar-config";
import {
  defaultUserPreferences,
  normaliseUserPreferences,
  validateUserPreferencePatch,
  type UserPreferences,
} from "@/lib/theme/user-preferences";

type UserPreferenceRow = { preferences: unknown };
const savePreferencesQuery = `
  insert into user_preferences (user_id, preferences) values ($1, $2::jsonb)
  on conflict (user_id) do update
  set preferences = user_preferences.preferences || excluded.preferences, updated_at = now()
`;

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

    if (patch.avatar !== undefined) {
      if (user.role !== "student")
        throw new Error("Avatar choices are available to students.");
      const client = await db.connect();
      try {
        await client.query("begin");
        await client.query(savePreferencesQuery, [
          user.id,
          JSON.stringify(patch),
        ]);
        // Keep the shared profile image reference in sync so staff lists show the same avatar.
        // Never let a preference overwrite a school-managed photo.
        await client.query(
          `update users set profile_image_url = $1, updated_at = now()
           where id = $2 and (profile_image_url = '' or profile_image_url = any($3::text[]))`,
          [getPresetAvatarUrl(patch.avatar), user.id, presetAvatarUrls],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
      return { ok: true as const };
    }

    await db.query(savePreferencesQuery, [user.id, JSON.stringify(patch)]);

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
