import { createHash } from "crypto";
import { db } from "@/lib/database/db";

type ApiIdempotencyRow = {
  request_hash: string;
  response_body: unknown;
  status_code: number;
};

export type IdempotencyResult =
  | {
      responseBody: unknown;
      statusCode: number;
      type: "cached";
    }
  | {
      type: "conflict";
    }
  | {
      type: "in_progress";
    }
  | {
      type: "new";
    };

const maxIdempotencyKeyLength = 128;

export class ApiIdempotencyService {
  async reserve(
    clientId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<IdempotencyResult> {
    await db.query(
      `
        delete from api_idempotency_keys
        where client_id = $1
          and idempotency_key = $2
          and expires_at <= now()
      `,
      [clientId, idempotencyKey],
    );

    const reservation = await db.query(
      `
        insert into api_idempotency_keys (
          client_id,
          idempotency_key,
          request_hash,
          expires_at
        )
        values ($1, $2, $3, now() + interval '24 hours')
        on conflict (client_id, idempotency_key) do nothing
        returning id
      `,
      [clientId, idempotencyKey, requestHash],
    );

    if (reservation.rowCount === 1) {
      return { type: "new" } as const;
    }

    const result = await db.query<ApiIdempotencyRow & { completed_at: Date | null }>(
      `
        select request_hash, response_body, status_code, completed_at
        from api_idempotency_keys
        where client_id = $1
          and idempotency_key = $2
        limit 1
      `,
      [clientId, idempotencyKey],
    );
    const existing = result.rows[0];

    if (!existing) {
      return { type: "in_progress" };
    }

    if (existing.request_hash !== requestHash) {
      return { type: "conflict" };
    }

    if (!existing.completed_at) {
      return { type: "in_progress" };
    }

    return {
      responseBody: existing.response_body,
      statusCode: existing.status_code,
      type: "cached",
    };
  }

  async complete(
    clientId: string,
    idempotencyKey: string,
    requestHash: string,
    statusCode: number,
    responseBody: unknown,
  ) {
    await db.query(
      `
        update api_idempotency_keys
        set response_body = $4::jsonb,
            status_code = $5,
            completed_at = now()
        where client_id = $1
          and idempotency_key = $2
          and request_hash = $3
      `,
      [
        clientId,
        idempotencyKey,
        requestHash,
        JSON.stringify(responseBody),
        statusCode,
      ],
    );
  }

  async abandon(clientId: string, idempotencyKey: string, requestHash: string) {
    await db.query(
      `
        delete from api_idempotency_keys
        where client_id = $1
          and idempotency_key = $2
          and request_hash = $3
          and completed_at is null
      `,
      [clientId, idempotencyKey, requestHash],
    );
  }
}

export function getIdempotencyKey(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";

  if (!idempotencyKey || idempotencyKey.length > maxIdempotencyKeyLength) {
    return "";
  }

  return idempotencyKey;
}

export function hashApiRequest(request: Request, bodyText: string) {
  return createHash("sha256")
    .update(request.method)
    .update(":")
    .update(new URL(request.url).pathname)
    .update(":")
    .update(bodyText)
    .digest("hex");
}
