import { db } from "@/lib/database/db";
import { canViewAuditLog } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

type ErrorLogInput = {
  context?: Record<string, unknown>;
  error: unknown;
  source: string;
};

export type ErrorLogItem = {
  context: Record<string, unknown>;
  createdAt: string;
  id: string;
  message: string;
  source: string;
  stack: string;
};

type ErrorLogRow = {
  context: Record<string, unknown>;
  created_at: Date;
  id: string;
  message: string;
  source: string;
  stack: string;
};

export class ErrorLogService {
  async listRecent(currentUser: SessionUser): Promise<ErrorLogItem[]> {
    if (!canViewAuditLog(currentUser)) {
      return [];
    }

    const result = await db.query<ErrorLogRow>(`
      select id, source, message, stack, context, created_at
      from server_error_log
      order by created_at desc
      limit 200
    `);

    return result.rows.map(mapErrorLogRow);
  }

  async log(input: ErrorLogInput) {
    try {
      await db.query(
        `
          insert into server_error_log (source, message, stack, context)
          values ($1, $2, $3, $4)
        `,
        [
          input.source,
          getErrorMessage(input.error),
          getErrorStack(input.error),
          JSON.stringify(input.context ?? {}),
        ],
      );
    } catch (logError) {
      console.error("Error log write failed", logError);
    }
  }
}

function mapErrorLogRow(row: ErrorLogRow): ErrorLogItem {
  return {
    context: row.context ?? {},
    createdAt: row.created_at.toISOString(),
    id: row.id,
    message: row.message,
    source: row.source,
    stack: row.stack,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getErrorStack(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? "";
  }

  return "";
}
