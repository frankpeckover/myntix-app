import { Pool, type QueryResult, type QueryResultRow } from "pg";

const defaultPostgresPort = 5432;
const poolOptions = {
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 5,
};
const requiredConfiguration = [
  "BACKUP_CATALOG_HOST",
  "BACKUP_CATALOG_DATABASE",
  "BACKUP_CATALOG_USER",
  "BACKUP_CATALOG_PASSWORD",
] as const;

declare global {
  var appBackupCataloguePool: Pool | undefined;
}

export class BackupCatalogueNotConfiguredError extends Error {
  constructor() {
    super("The backup catalogue database is not configured.");
    this.name = "BackupCatalogueNotConfiguredError";
  }
}

export function isBackupCatalogueConfigured() {
  return requiredConfiguration.every((name) => process.env[name]?.trim());
}

export const backupDb = {
  async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    return getBackupCataloguePool().query<Row>(text, values);
  },
};

function getBackupCataloguePool() {
  if (!isBackupCatalogueConfigured()) {
    throw new BackupCatalogueNotConfiguredError();
  }

  if (globalThis.appBackupCataloguePool) {
    return globalThis.appBackupCataloguePool;
  }

  const pool = new Pool({
    ...poolOptions,
    database: process.env.BACKUP_CATALOG_DATABASE,
    host: process.env.BACKUP_CATALOG_HOST,
    password: process.env.BACKUP_CATALOG_PASSWORD,
    port: parsePort(process.env.BACKUP_CATALOG_PORT),
    user: process.env.BACKUP_CATALOG_USER,
  });

  globalThis.appBackupCataloguePool = pool;
  return pool;
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? defaultPostgresPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("BACKUP_CATALOG_PORT must be an integer between 1 and 65535.");
  }
  return port;
}
