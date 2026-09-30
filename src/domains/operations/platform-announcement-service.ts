import { platformDb } from "@/lib/database/db";

type PlatformAnnouncementRow = {
  message: string;
};

const missingTableErrorCode = "42P01";

export async function getActiveMaintenanceMessage() {
  try {
    const result = await platformDb.query<PlatformAnnouncementRow>(
      `
        select message
        from platform_announcements
        where is_active = true
          and starts_at <= now()
          and (ends_at is null or ends_at > now())
        order by starts_at desc, created_at desc
        limit 1
      `,
    );

    return result.rows[0]?.message.trim() ?? "";
  } catch (error) {
    if (isMissingAnnouncementTableError(error)) {
      console.error(
        "Platform announcements are unavailable. Run the latest platform database setup.",
      );
      return "";
    }

    throw error;
  }
}

function isMissingAnnouncementTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === missingTableErrorCode
  );
}
