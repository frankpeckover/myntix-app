import { AuditService } from "@/domains/audit/audit-service";
import {
  backupDb,
  isBackupCatalogueConfigured,
} from "@/lib/database/backup-db";
import { getCurrentTenantSlug, platformDb } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";

type OrganisationRow = {
  id: string;
  name: string;
  slug: string;
};

type BackupRow = {
  checksum_sha256: string;
  completed_at: Date;
  created_at: Date;
  id: string;
  size_bytes: string;
  source: TenantBackupSource;
};

type BackupJobRow = {
  backup_id: string | null;
  completed_at: Date | null;
  error_message: string | null;
  id: string;
  job_type: TenantBackupJobType;
  phase: string;
  requested_at: Date;
  source: "manual" | "scheduled";
  started_at: Date | null;
  status: TenantBackupJobStatus;
};

export type TenantBackupSource = "manual" | "pre_restore" | "scheduled";
export type TenantBackupJobType = "backup" | "restore";
export type TenantBackupJobStatus =
  | "cancelled"
  | "failed"
  | "queued"
  | "running"
  | "succeeded";

export type TenantBackupOverview = {
  backups: Array<{
    checksumSha256: string;
    completedAt: string;
    createdAt: string;
    id: string;
    sizeBytes: number;
    source: TenantBackupSource;
  }>;
  configured: boolean;
  jobs: Array<{
    backupId: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    id: string;
    jobType: TenantBackupJobType;
    phase: string;
    requestedAt: string;
    source: "manual" | "scheduled";
    startedAt: string | null;
    status: TenantBackupJobStatus;
  }>;
  organisationName: string;
};

const auditService = new AuditService();
const manualBackupCooldownMinutes = 15;

export class TenantBackupService {
  async getOverview(): Promise<TenantBackupOverview> {
    if (!isBackupCatalogueConfigured()) {
      return {
        backups: [],
        configured: false,
        jobs: [],
        organisationName: "",
      };
    }

    const organisation = await getCurrentOrganisation();
    const [backups, jobs] = await Promise.all([
      backupDb.query<BackupRow>(
        `
          select id, source, size_bytes, checksum_sha256, created_at, completed_at
          from tenant_backups
          where organisation_id = $1
            and status = 'available'
          order by completed_at desc
          limit 25
        `,
        [organisation.id],
      ),
      backupDb.query<BackupJobRow>(
        `
          select id, job_type, source, status, phase, backup_id,
                 requested_at, started_at, completed_at, error_message
          from backup_jobs
          where organisation_id = $1
          order by requested_at desc
          limit 15
        `,
        [organisation.id],
      ),
    ]);

    return {
      backups: backups.rows.map((backup) => ({
        checksumSha256: backup.checksum_sha256,
        completedAt: backup.completed_at.toISOString(),
        createdAt: backup.created_at.toISOString(),
        id: backup.id,
        sizeBytes: Number(backup.size_bytes),
        source: backup.source,
      })),
      configured: true,
      jobs: jobs.rows.map(mapJob),
      organisationName: organisation.name,
    };
  }

  async requestBackup(currentUser: SessionUser) {
    if (!isBackupCatalogueConfigured()) {
      return { message: "Backups are not configured.", ok: false as const };
    }

    const organisation = await getCurrentOrganisation();

    try {
      const result = await backupDb.query<{ id: string }>(
        `
          insert into backup_jobs (
            organisation_id, organisation_slug, organisation_name,
            job_type, source, requested_by_user_id
          )
          select $1, $2, $3, 'backup', 'manual', $4
          where not exists (
            select 1
            from backup_jobs
            where organisation_id = $1
              and job_type = 'backup'
              and requested_at > now() - ($5::int * interval '1 minute')
          )
          returning id
        `,
        [
          organisation.id,
          organisation.slug,
          organisation.name,
          currentUser.id,
          manualBackupCooldownMinutes,
        ],
      );

      if (result.rowCount !== 1) {
        return {
          message: `A backup was already requested in the last ${manualBackupCooldownMinutes} minutes.`,
          ok: false as const,
        };
      }

      await auditService.log({
        action: "backup.requested",
        actorUserId: currentUser.id,
        details: { jobId: result.rows[0].id, source: "manual" },
        entityId: result.rows[0].id,
        entityType: "backup_job",
      });

      return {
        jobId: result.rows[0].id,
        message: "Backup queued.",
        ok: true as const,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          message: "A backup or restore is already queued or running.",
          ok: false as const,
        };
      }
      throw error;
    }
  }

  async requestRestore(
    currentUser: SessionUser,
    input: { backupId: string; confirmation: string },
  ) {
    if (!isBackupCatalogueConfigured()) {
      return { message: "Backups are not configured.", ok: false as const };
    }

    const organisation = await getCurrentOrganisation();
    if (input.confirmation.trim() !== organisation.name) {
      return {
        message: `Enter ${organisation.name} exactly to confirm.`,
        ok: false as const,
      };
    }

    const backup = await backupDb.query<{ id: string }>(
      `
        select id
        from tenant_backups
        where id = $1
          and organisation_id = $2
          and status = 'available'
        limit 1
      `,
      [input.backupId, organisation.id],
    );

    if (backup.rowCount !== 1) {
      return {
        message: "That restore point is unavailable.",
        ok: false as const,
      };
    }

    try {
      const result = await backupDb.query<{ id: string }>(
        `
          insert into backup_jobs (
            organisation_id, organisation_slug, organisation_name,
            job_type, source, backup_id, requested_by_user_id
          )
          values ($1, $2, $3, 'restore', 'manual', $4, $5)
          returning id
        `,
        [
          organisation.id,
          organisation.slug,
          organisation.name,
          input.backupId,
          currentUser.id,
        ],
      );

      await auditService.log({
        action: "backup.restore_requested",
        actorUserId: currentUser.id,
        details: { backupId: input.backupId, jobId: result.rows[0].id },
        entityId: result.rows[0].id,
        entityType: "backup_job",
      });

      return {
        jobId: result.rows[0].id,
        message: "Restore queued. A safety backup will be created first.",
        ok: true as const,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          message: "A backup or restore is already queued or running.",
          ok: false as const,
        };
      }
      throw error;
    }
  }
}

async function getCurrentOrganisation() {
  const slug = await getCurrentTenantSlug();
  const result = await platformDb.query<OrganisationRow>(
    `select id, slug, name from organisations where slug = $1 and is_active = true limit 1`,
    [slug],
  );
  const organisation = result.rows[0];

  if (!organisation) {
    throw new Error("The organisation could not be found.");
  }

  return organisation;
}

function mapJob(job: BackupJobRow) {
  return {
    backupId: job.backup_id,
    completedAt: job.completed_at?.toISOString() ?? null,
    errorMessage: job.error_message,
    id: job.id,
    jobType: job.job_type,
    phase: job.phase,
    requestedAt: job.requested_at.toISOString(),
    source: job.source,
    startedAt: job.started_at?.toISOString() ?? null,
    status: job.status,
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
