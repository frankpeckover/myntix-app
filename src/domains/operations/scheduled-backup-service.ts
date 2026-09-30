import type { PoolClient } from "pg";
import { backupDb, isBackupCatalogueConfigured } from "@/lib/database/backup-db";
import { connectTenantBySlug, platformDb } from "@/lib/database/db";

type OrganisationRow = {
  id: string;
  name: string;
  slug: string;
};

type LocalSchedule = {
  date: string;
  hour: number;
};

const scheduledBackupHour = 1;
const maximumDailyAttempts = 3;

export type ScheduledBackupSummary = {
  failed: number;
  queued: number;
  skipped: number;
};

export class ScheduledBackupService {
  async queueDueBackups(now = new Date()): Promise<ScheduledBackupSummary> {
    const summary: ScheduledBackupSummary = { failed: 0, queued: 0, skipped: 0 };
    if (!isBackupCatalogueConfigured()) return summary;

    const organisations = await platformDb.query<OrganisationRow>(`
      select id, slug, name
      from organisations
      where is_active = true and maintenance_mode = false
      order by slug
    `);

    for (const organisation of organisations.rows) {
      let client: PoolClient | null = null;
      try {
        client = await connectTenantBySlug(organisation.slug);
        const timezoneResult = await client.query<{ timezone: string | null }>(
          `select timezone from school_info where id = 1 limit 1`,
        );
        const schedule = localSchedule(
          now,
          timezoneResult.rows[0]?.timezone?.trim() || "UTC",
        );

        if (schedule.hour < scheduledBackupHour) {
          summary.skipped += 1;
          continue;
        }

        const result = await backupDb.query<{ id: string }>(
          `
            insert into backup_jobs (
              organisation_id, organisation_slug, organisation_name,
              job_type, source, metadata
            )
            select $1, $2, $3, 'backup', 'scheduled', $4::jsonb
            where not exists (
              select 1 from backup_jobs
              where organisation_id = $1
                and source = 'scheduled'
                and metadata ->> 'localBackupDate' = $5
                and status in ('queued', 'running', 'succeeded')
            )
            and (
              select count(*) from backup_jobs
              where organisation_id = $1
                and source = 'scheduled'
                and metadata ->> 'localBackupDate' = $5
                and status = 'failed'
            ) < $6
            returning id
          `,
          [
            organisation.id,
            organisation.slug,
            organisation.name,
            JSON.stringify({ localBackupDate: schedule.date }),
            schedule.date,
            maximumDailyAttempts,
          ],
        );

        if (result.rowCount === 1) summary.queued += 1;
        else summary.skipped += 1;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          summary.failed += 1;
          console.error(`Could not schedule backup for ${organisation.slug}.`, error);
        } else {
          summary.skipped += 1;
        }
      } finally {
        client?.release();
      }
    }

    return summary;
  }
}

function localSchedule(now: Date, timezone: string): LocalSchedule {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      hour: Number(values.hour),
    };
  } catch {
    return localSchedule(now, "UTC");
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
