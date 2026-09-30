import { headers } from "next/headers";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import {
  getRequiredServerEnv,
  getRequiredServerEnvInProduction,
  getServerEnvNumber,
} from "@/lib/config/server-env";

type TenantDatabaseConfig = {
  mode: "database";
  database: string;
  host: string;
  password: string;
  port: number;
  slug: string;
  user: string;
};

type TenantSchemaConfig = {
  mode: "schema";
  schemaName: string;
  slug: string;
};

type TenantTarget = TenantDatabaseConfig | TenantSchemaConfig;

type OrganisationTenantRow = {
  primary_domain: string;
  slug: string;
  tenancy_mode: string | null;
  schema_name: string | null;
  database_host: string | null;
  database_port: number | null;
  database_name: string | null;
  database_user: string | null;
  database_password: string | null;
  is_active: boolean;
  maintenance_message: string | null;
  maintenance_mode: boolean;
};

type TenantLookup = {
  host: string;
  slug: string;
};

const rootDomain = getRequiredServerEnvInProduction(
  "APP_ROOT_DOMAIN",
  "app.local",
);
const localOrganisationSlug = getRequiredServerEnvInProduction(
  "LOCAL_ORGANISATION_SLUG",
  "local",
);
const defaultPostgresPort = 5432;
const poolOptions = {
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 5,
};
const allowOrganisationHeaderOverride =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_ORGANISATION_HEADER_OVERRIDE === "true";

declare global {
  var appTenantPools: Map<string, Pool> | undefined;
  var appPlatformPool: Pool | undefined;
  var appSharedSchemaPool: Pool | undefined;
}

export const db = {
  async connect(): Promise<PoolClient> {
    const tenantTarget = await resolveTenantTarget();

    return connectTenantClient(tenantTarget);
  },

  async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    const tenantTarget = await resolveTenantTarget();

    if (tenantTarget.mode === "database") {
      return getDatabaseTenantPool(tenantTarget).query<Row>(text, values);
    }

    const client = await connectTenantClient(tenantTarget);

    try {
      return await client.query<Row>(text, values);
    } finally {
      client.release();
    }
  },
};

export const platformDb = {
  async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    return getPlatformPool().query<Row>(text, values);
  },
};

export class TenantNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

export class TenantMaintenanceError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "TenantMaintenanceError";
  }
}

export async function assertCurrentTenantExists() {
  await resolveTenantTarget();
}

export async function getCurrentTenantSlug() {
  return (await resolveTenantTarget()).slug;
}

export type ActiveTenantReference = {
  primaryDomain: string;
  slug: string;
};

export async function listActiveTenantReferences(): Promise<ActiveTenantReference[]> {
  const result = await getPlatformPool().query<{
    primary_domain: string;
    slug: string;
  }>(
    `
      select slug, primary_domain
      from organisations
      where is_active = true
      order by slug
    `,
  );

  return result.rows.map((row) => ({
    primaryDomain: row.primary_domain,
    slug: row.slug,
  }));
}

export async function connectTenantBySlug(slug: string): Promise<PoolClient> {
  const tenantTarget = await getOrganisationTenantTarget({
    host: "",
    slug: normaliseSlug(slug),
  });

  return connectTenantClient(tenantTarget);
}

async function connectTenantClient(tenantTarget: TenantTarget) {
  if (tenantTarget.mode === "schema") {
    return connectSchemaTenantClient(tenantTarget);
  }

  const pool = getDatabaseTenantPool(tenantTarget);

  return pool.connect();
}

async function connectSchemaTenantClient(tenantTarget: TenantSchemaConfig) {
  const client = await getSharedSchemaPool().connect();

  try {
    await client.query(
      `set search_path to ${quoteIdentifier(tenantTarget.schemaName)}, public`,
    );
  } catch (error) {
    client.release(error instanceof Error ? error : undefined);
    throw error;
  }

  return wrapSchemaTenantClient(client);
}

function getDatabaseTenantPool(tenantConfig: TenantDatabaseConfig) {
  const poolKey = getDatabaseTenantPoolKey(tenantConfig);
  const pools = getTenantPools();
  const existingPool = pools.get(poolKey);

  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({
    ...poolOptions,
    database: tenantConfig.database,
    host: tenantConfig.host,
    password: tenantConfig.password,
    port: tenantConfig.port,
    user: tenantConfig.user,
  });

  pools.set(poolKey, pool);

  return pool;
}

async function resolveTenantTarget(): Promise<TenantTarget> {
  const tenantLookup = await resolveTenantLookup();

  return getOrganisationTenantTarget(tenantLookup);
}

async function resolveTenantLookup(): Promise<TenantLookup> {
  const requestHeaders = await headers();
  const overrideSlug = requestHeaders.get("x-organisation-slug");
  const host = getHostname(requestHeaders.get("host"));

  if (overrideSlug && allowOrganisationHeaderOverride) {
    return {
      host,
      slug: normaliseSlug(overrideSlug),
    };
  }

  return getTenantLookupFromHost(host);
}

function getTenantLookupFromHost(host: string): TenantLookup {
  if (isLocalHost(host)) {
    return {
      host,
      slug: localOrganisationSlug,
    };
  }

  if (host === rootDomain) {
    return {
      host,
      slug: localOrganisationSlug,
    };
  }

  if (host.endsWith(`.${rootDomain}`)) {
    return {
      host,
      slug: normaliseSlug(host.slice(0, -rootDomain.length - 1).split(".")[0]),
    };
  }

  return {
    host,
    slug: normaliseSlug(host),
  };
}

async function getOrganisationTenantTarget(
  lookup: TenantLookup,
): Promise<TenantTarget> {
  const result = await getPlatformPool().query<OrganisationTenantRow>(
    `
      select slug,
             primary_domain,
             tenancy_mode,
             schema_name,
             database_host,
             database_port,
             database_name,
             database_user,
             database_password,
             is_active,
             maintenance_mode,
             maintenance_message
      from organisations
      where organisations.slug = $1
         or organisations.primary_domain = $2
      limit 1
    `,
    [lookup.slug, lookup.host],
  );
  const organisation = result.rows[0];

  if (!organisation || !organisation.is_active) {
    throw new TenantNotFoundError(
      `No active organisation found for "${lookup.slug}" or "${lookup.host}".`,
    );
  }

  if (organisation.maintenance_mode) {
    throw new TenantMaintenanceError(
      organisation.maintenance_message ||
        "This organisation is temporarily unavailable while maintenance is completed.",
    );
  }

  validateOrganisationDatabaseConfig(organisation);

  if (getTenancyMode(organisation) === "schema") {
    const schemaName = validateOrganisationSchemaConfig(organisation);

    return {
      mode: "schema",
      schemaName,
      slug: organisation.slug,
    };
  }

  return {
    database: organisation.database_name,
    host: organisation.database_host,
    mode: "database",
    password: organisation.database_password,
    port: organisation.database_port ?? defaultPostgresPort,
    slug: organisation.slug,
    user: organisation.database_user,
  };
}

function getPlatformPool() {
  if (globalThis.appPlatformPool) {
    return globalThis.appPlatformPool;
  }

  const platformPool = new Pool({
    ...poolOptions,
    database: getRequiredServerEnv("PLATFORM_POSTGRES_DATABASE"),
    host: getRequiredServerEnv("PLATFORM_POSTGRES_HOST"),
    password: getRequiredServerEnv("PLATFORM_POSTGRES_PASSWORD"),
    port: getServerEnvNumber("PLATFORM_POSTGRES_PORT", defaultPostgresPort),
    user: getRequiredServerEnv("PLATFORM_POSTGRES_USER"),
  });

  globalThis.appPlatformPool = platformPool;

  return platformPool;
}

function getSharedSchemaPool() {
  if (globalThis.appSharedSchemaPool) {
    return globalThis.appSharedSchemaPool;
  }

  const sharedSchemaPool = new Pool({
    ...poolOptions,
    database: getRequiredServerEnv("APP_POSTGRES_DATABASE"),
    host: getRequiredServerEnv("APP_POSTGRES_HOST"),
    password: getRequiredServerEnv("APP_POSTGRES_PASSWORD"),
    port: getServerEnvNumber("APP_POSTGRES_PORT", defaultPostgresPort),
    user: getRequiredServerEnv("APP_POSTGRES_USER"),
  });

  globalThis.appSharedSchemaPool = sharedSchemaPool;

  return sharedSchemaPool;
}

function validateOrganisationDatabaseConfig(
  organisation: OrganisationTenantRow,
): asserts organisation is OrganisationTenantRow & {
  database_host: string;
  database_name: string;
  database_password: string;
  database_user: string;
} {
  if (getTenancyMode(organisation) !== "database") {
    return;
  }

  const missingFields = [
    ["database_host", organisation.database_host],
    ["database_name", organisation.database_name],
    ["database_user", organisation.database_user],
    ["database_password", organisation.database_password],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([field]) => field);

  if (missingFields.length > 0) {
    throw new Error(
      `Organisation "${organisation.slug}" is missing database settings: ${missingFields.join(", ")}.`,
    );
  }
}

function validateOrganisationSchemaConfig(organisation: OrganisationTenantRow) {
  const schemaName = organisation.schema_name?.trim() ?? "";

  if (!schemaName) {
    throw new Error(
      `Organisation "${organisation.slug}" is missing schema_name for schema tenancy.`,
    );
  }

  validateSchemaName(schemaName, organisation.slug);

  return schemaName;
}

function getTenancyMode(organisation: OrganisationTenantRow) {
  return organisation.tenancy_mode === "schema" ? "schema" : "database";
}

function getTenantPools() {
  if (!globalThis.appTenantPools) {
    globalThis.appTenantPools = new Map<string, Pool>();
  }

  return globalThis.appTenantPools;
}

function getDatabaseTenantPoolKey(config: TenantDatabaseConfig) {
  return [
    config.mode,
    config.slug,
    config.host,
    config.port,
    config.database,
    config.user,
  ].join(":");
}

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function isLocalHost(host: string) {
  return host === "" || host === "localhost" || host === "127.0.0.1";
}

function normaliseSlug(value: string) {
  return value.trim().toLowerCase();
}

function validateSchemaName(schemaName: string, organisationSlug: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(schemaName) || schemaName.startsWith("pg_")) {
    throw new Error(
      `Organisation "${organisationSlug}" has invalid schema_name "${schemaName}".`,
    );
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function wrapSchemaTenantClient(client: PoolClient) {
  const originalRelease = client.release.bind(client);
  let hasReleased = false;

  client.release = ((error?: Error | boolean) => {
    if (hasReleased) {
      return;
    }

    hasReleased = true;

    if (error) {
      originalRelease(error);
      return;
    }

    void client
      .query("reset search_path")
      .catch(() => undefined)
      .finally(() => originalRelease());
  }) as typeof client.release;

  return client;
}
