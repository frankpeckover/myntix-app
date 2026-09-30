import { backupDb, isBackupCatalogueConfigured } from "@/lib/database/backup-db";
import { db, getCurrentTenantSlug, platformDb } from "@/lib/database/db";

export type OperationsDashboardSnapshot = {
  api: {
    activeClients: number;
    failedRequestsLast24Hours: number;
    lastRequestAt: string | null;
    requestsLast24Hours: number;
  };
  backup: {
    destinationLabel: string | null;
    lastAttemptAt: string | null;
    lastSuccessfulAt: string | null;
    status: "failed" | "healthy" | "not_configured" | "running";
  };
  security: {
    events: SecurityActivityItem[];
    failedLoginsLast24Hours: number;
  };
  system: {
    errorCountLast24Hours: number;
    lastErrorAt: string | null;
    status: "attention" | "operational";
  };
};

export type SecurityActivityItem = {
  action: string;
  actor: string;
  createdAt: string;
  successful: boolean;
};

type OperationsRow = {
  active_api_clients: string;
  api_failures_24h: string;
  api_requests_24h: string;
  errors_24h: string;
  failed_logins_24h: string;
  last_api_request_at: Date | null;
  last_error_at: Date | null;
};

type BackupRow = {
  destination_label: string;
  last_attempt_at: Date | null;
  last_successful_at: Date | null;
  status: "failed" | "running" | "succeeded";
};

type SecurityActivityRow = {
  action: string;
  actor: string | null;
  created_at: Date;
};

export class OperationsDashboardService {
  async getSnapshot(): Promise<OperationsDashboardSnapshot> {
    const [operationsResult, backupResult, securityResult] = await Promise.all([
      db.query<OperationsRow>(`
        select
          (select count(*) from server_error_log where created_at >= now() - interval '24 hours') as errors_24h,
          (select max(created_at) from server_error_log) as last_error_at,
          (select count(*) from audit_log where action = 'auth.login_failed' and created_at >= now() - interval '24 hours') as failed_logins_24h,
          (select count(*) from api_clients where is_active = true and revoked_at is null) as active_api_clients,
          (select count(*) from api_request_log where created_at >= now() - interval '24 hours') as api_requests_24h,
          (select count(*) from api_request_log where status_code >= 400 and created_at >= now() - interval '24 hours') as api_failures_24h,
          (select max(created_at) from api_request_log) as last_api_request_at
      `),
      getBackupStatus(),
      db.query<SecurityActivityRow>(`
        select
          audit_log.action,
          coalesce(
            trim(users.first_name || ' ' || users.last_name),
            audit_log.details ->> 'username',
            'System'
          ) as actor,
          audit_log.created_at
        from audit_log
        left join users on users.id = audit_log.actor_user_id
        where audit_log.action like 'auth.%'
           or audit_log.action like 'api_client.%'
        order by audit_log.created_at desc
        limit 5
      `),
    ]);

    const operations = operationsResult.rows[0];
    const backup = backupResult.rows[0];
    const errorCount = toNumber(operations.errors_24h);

    return {
      api: {
        activeClients: toNumber(operations.active_api_clients),
        failedRequestsLast24Hours: toNumber(operations.api_failures_24h),
        lastRequestAt: toIsoString(operations.last_api_request_at),
        requestsLast24Hours: toNumber(operations.api_requests_24h),
      },
      backup: backup
        ? {
            destinationLabel: backup.destination_label || null,
            lastAttemptAt: toIsoString(backup.last_attempt_at),
            lastSuccessfulAt: toIsoString(backup.last_successful_at),
            status: backup.status === "succeeded" ? "healthy" : backup.status,
          }
        : {
            destinationLabel: null,
            lastAttemptAt: null,
            lastSuccessfulAt: null,
            status: "not_configured",
          },
      security: {
        events: securityResult.rows.map((event) => ({
          action: formatAuditAction(event.action),
          actor: event.actor ?? "System",
          createdAt: event.created_at.toISOString(),
          successful: !event.action.includes("failed") && !event.action.includes("revoked"),
        })),
        failedLoginsLast24Hours: toNumber(operations.failed_logins_24h),
      },
      system: {
        errorCountLast24Hours: errorCount,
        lastErrorAt: toIsoString(operations.last_error_at),
        status: errorCount > 0 ? "attention" : "operational",
      },
    };
  }
}

async function getBackupStatus() {
  if (!isBackupCatalogueConfigured()) {
    return { rows: [] as BackupRow[] };
  }

  try {
    const slug = await getCurrentTenantSlug();
    const organisation = await platformDb.query<{ id: string }>(
      `select id from organisations where slug = $1 limit 1`,
      [slug],
    );
    const organisationId = organisation.rows[0]?.id;
    if (!organisationId) return { rows: [] as BackupRow[] };

    return backupDb.query<BackupRow>(
      `
        select
          case
            when latest.status in ('queued', 'running') then 'running'
            when latest.status in ('failed', 'cancelled') then 'failed'
            else 'succeeded'
          end as status,
          'Encrypted offsite storage' as destination_label,
          latest.requested_at as last_attempt_at,
          (
            select max(completed_at)
            from tenant_backups
            where organisation_id = $1 and status = 'available'
          ) as last_successful_at
        from (select $1::uuid as organisation_id) organisation
        left join lateral (
          select status, requested_at
          from backup_jobs
          where organisation_id = $1
          order by requested_at desc
          limit 1
        ) latest on true
        where latest.status is not null
           or exists (
             select 1 from tenant_backups
             where organisation_id = $1 and status = 'available'
           )
      `,
      [organisationId],
    );
  } catch (error) {
    console.error("Could not load backup catalogue status.", error);
    return { rows: [] as BackupRow[] };
  }
}

function formatAuditAction(action: string) {
  return action
    .split(".")
    .at(-1)!
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}
