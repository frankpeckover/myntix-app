import { db } from "@/lib/database/db";
import { canViewAuditLog } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { PoolClient } from "pg";

type AuditLogInput = {
  action: string;
  actorUserId?: string | null;
  details?: Record<string, unknown>;
  entityId?: string | null;
  entityType: string;
};

export type AuditLogItem = {
  action: string;
  actorName: string | null;
  actorUsername: string | null;
  createdAt: string;
  details: Record<string, unknown>;
  entityId: string | null;
  entityType: string;
  id: string;
};

type AuditLogRow = {
  action: string;
  actor_name: string | null;
  actor_username: string | null;
  created_at: Date;
  details: Record<string, unknown>;
  entity_id: string | null;
  entity_type: string;
  id: string;
};

const adminAuditActionPrefixes = [
  "api_client.",
  "auth.",
  "backup.",
  "data_export.",
  "directory_sync.",
  "finance_api.",
  "school_info.",
  "shop_item.",
  "sso_provider.",
  "student_group.",
  "timetable_entry.",
  "transaction_presets.",
  "user.",
];

export class AuditService {
  async listRecent(currentUser: SessionUser): Promise<AuditLogItem[]> {
    if (!canViewAuditLog(currentUser)) {
      return [];
    }

    const result = await db.query<AuditLogRow>(`
      select
        audit_log.id,
        audit_log.action,
        audit_log.entity_type,
        audit_log.entity_id,
        audit_log.details,
        audit_log.created_at,
        trim(users.first_name || ' ' || users.last_name) as actor_name,
        users.username as actor_username
      from audit_log
      left join users on users.id = audit_log.actor_user_id
      where ${buildAdminAuditActionFilter()}
      order by audit_log.created_at desc
    `,
      adminAuditActionPrefixes,
    );

    return result.rows.map(mapAuditLogRow);
  }

  async log(input: AuditLogInput) {
    await this.insertAuditLog(db, input);
  }

  async logWithClient(client: PoolClient, input: AuditLogInput) {
    await this.insertAuditLog(client, input);
  }

  private async insertAuditLog(
    client: Pick<typeof db, "query">,
    input: AuditLogInput,
  ) {
    await client.query(
      `
        insert into audit_log (
          actor_user_id,
          action,
          entity_type,
          entity_id,
          details
        )
        values ($1, $2, $3, $4, $5)
      `,
      [
        input.actorUserId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.details ?? {}),
      ],
    );
  }
}

function buildAdminAuditActionFilter() {
  return adminAuditActionPrefixes
    .map((_, index) => `audit_log.action like $${index + 1} || '%'`)
    .join(" or ");
}

function mapAuditLogRow(row: AuditLogRow): AuditLogItem {
  return {
    action: row.action,
    actorName: row.actor_name,
    actorUsername: row.actor_username,
    createdAt: row.created_at.toISOString(),
    details: row.details ?? {},
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
  };
}
