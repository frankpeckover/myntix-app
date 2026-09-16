import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashServerSecret } from "@/lib/server-hash";
import type { ApiClient, ApiScope } from "@/lib/api/api-types";

type ApiClientRow = {
  created_at?: Date;
  id: string;
  is_active?: boolean;
  key_prefix?: string;
  name: string;
  scopes: ApiScope[];
  updated_at?: Date;
};

const bearerPrefix = "Bearer ";
const apiKeyHashSecretEnv = "API_KEY_HASH_SECRET";
const apiKeyBytes = 32;
const apiKeyPrefixLength = 20;
const allowedApiScopes: ApiScope[] = [
  "accounts:read",
  "ledger:read",
  "ledger:credit",
  "ledger:debit",
  "holds:read",
  "holds:write",
  "rewards:read",
  "purchases:read",
  "purchases:write",
];

export class ApiAuthenticationError extends Error {
  constructor(
    public readonly code: "invalid_api_key" | "insufficient_scope",
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
  }
}

export type ApiClientSummary = {
  createdAt: string;
  id: string;
  isActive: boolean;
  keyPrefix: string;
  name: string;
  scopes: ApiScope[];
  updatedAt: string;
};

export type CreateApiClientInput = {
  name: string;
  scopes: ApiScope[];
};

export class ApiClientService {
  async listClients(): Promise<ApiClientSummary[]> {
    const result = await db.query<Required<ApiClientRow>>(
      `
        select
          api_clients.id,
          api_clients.name,
          api_clients.key_prefix,
          api_clients.is_active,
          api_clients.created_at,
          api_clients.updated_at,
          coalesce(
            array_agg(api_client_scopes.scope order by api_client_scopes.scope)
              filter (where api_client_scopes.scope is not null),
            '{}'
          ) as scopes
        from api_clients
        left join api_client_scopes on api_client_scopes.client_id = api_clients.id
        group by api_clients.id
        order by api_clients.created_at desc
      `,
    );

    return result.rows.map(mapApiClientSummary);
  }

  async createClient(input: CreateApiClientInput) {
    const name = input.name.trim();
    const scopes = getValidScopes(input.scopes);

    if (!name) {
      throw new Error("API key name is required.");
    }

    if (scopes.length === 0) {
      throw new Error("Select at least one API scope.");
    }

    const apiKey = generateApiKey();
    const client = await db.connect();

    try {
      await client.query("begin");

      const createdResult = await client.query<Required<ApiClientRow>>(
        `
          insert into api_clients (name, key_prefix, key_hash)
          values ($1, $2, $3)
          returning id, name, key_prefix, is_active, created_at, updated_at
        `,
        [name, getApiKeyPrefix(apiKey), hashApiKey(apiKey)],
      );
      const createdClient = createdResult.rows[0];

      await client.query(
        `
          insert into api_client_scopes (client_id, scope)
          select $1, unnest($2::text[])
        `,
        [createdClient.id, scopes],
      );

      await client.query("commit");

      return {
        apiKey,
        client: mapApiClientSummary({
          ...createdClient,
          scopes,
        }),
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async setClientActive(clientId: string, isActive: boolean) {
    const result = await db.query<Required<ApiClientRow>>(
      `
        update api_clients
        set is_active = $2,
            revoked_at = case when $2 then null else now() end,
            updated_at = now()
        where id = $1
        returning
          id,
          name,
          key_prefix,
          is_active,
          created_at,
          updated_at,
          (
            select coalesce(array_agg(scope order by scope), '{}')
            from api_client_scopes
            where api_client_scopes.client_id = api_clients.id
          ) as scopes
      `,
      [clientId, isActive],
    );
    const client = result.rows[0];

    if (!client) {
      throw new Error("API key was not found.");
    }

    return mapApiClientSummary(client);
  }

  async authenticate(
    authorizationHeader: string | null,
    requiredScope: ApiScope,
  ): Promise<ApiClient> {
    const apiKey = getBearerToken(authorizationHeader);

    if (!apiKey) {
      throw new ApiAuthenticationError(
        "invalid_api_key",
        "Provide a valid API key as a Bearer token.",
        401,
      );
    }

    const result = await db.query<ApiClientRow>(
      `
        select
          api_clients.id,
          api_clients.name,
          coalesce(array_agg(api_client_scopes.scope), '{}') as scopes
        from api_clients
        join api_client_scopes on api_client_scopes.client_id = api_clients.id
        where api_clients.key_hash = $1
          and api_clients.is_active = true
          and (api_clients.expires_at is null or api_clients.expires_at > now())
        group by api_clients.id, api_clients.name
        limit 1
      `,
      [hashApiKey(apiKey)],
    );
    const client = result.rows[0];

    if (!client) {
      throw new ApiAuthenticationError(
        "invalid_api_key",
        "The API key is invalid, expired, or revoked.",
        401,
      );
    }

    if (!client.scopes.includes(requiredScope)) {
      throw new ApiAuthenticationError(
        "insufficient_scope",
        `This API key requires the ${requiredScope} scope.`,
        403,
      );
    }

    await db.query(
      `update api_clients set last_used_at = now() where id = $1`,
      [client.id],
    );

    return {
      id: client.id,
      name: client.name,
      scopes: client.scopes,
    };
  }
}

export function getAllowedApiScopes() {
  return allowedApiScopes;
}

export function generateApiKey() {
  return `myntix_live_${randomBytes(apiKeyBytes).toString("base64url")}`;
}

export function getApiKeyPrefix(apiKey: string) {
  return apiKey.slice(0, apiKeyPrefixLength);
}

export function hashApiKey(apiKey: string) {
  return hashServerSecret(apiKey, apiKeyHashSecretEnv);
}

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith(bearerPrefix)) {
    return "";
  }

  return authorizationHeader.slice(bearerPrefix.length).trim();
}

function getValidScopes(scopes: ApiScope[]) {
  return Array.from(new Set(scopes)).filter((scope) =>
    allowedApiScopes.includes(scope),
  );
}

function mapApiClientSummary(row: Required<ApiClientRow>): ApiClientSummary {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    isActive: row.is_active,
    keyPrefix: row.key_prefix,
    name: row.name,
    scopes: row.scopes,
    updatedAt: row.updated_at.toISOString(),
  };
}
