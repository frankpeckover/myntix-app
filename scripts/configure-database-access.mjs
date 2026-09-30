#!/usr/bin/env node

import pg from "pg";
import { loadEnvironment } from "./env-file-loader.mjs";

const { Client } = pg;
const env = loadEnvironment();

const adminUser = required("DATABASE_ADMIN_USER");
const adminPassword = required("DATABASE_ADMIN_PASSWORD");
const adminHost = value("DATABASE_ADMIN_HOST", env.PLATFORM_POSTGRES_HOST);
const adminPort = portValue("DATABASE_ADMIN_PORT", env.PLATFORM_POSTGRES_PORT);
const platformDatabase = required("PLATFORM_POSTGRES_DATABASE");
const webPassword = required("MYNTIX_WEB_DATABASE_PASSWORD");
const backupPassword = required("MYNTIX_BACKUP_DATABASE_PASSWORD");
const removeLegacyRoles = process.argv.includes("--remove-legacy-roles");

const roles = {
  backup: "myntix_backup",
  backupCatalogue: "myntix_backup_catalog_access",
  backupRestore: "myntix_backup_restore_access",
  platform: "myntix_platform_access",
  tenant: "myntix_tenant_access",
  web: "myntix_web",
};
const legacyRoles = [
  "backup_app_user",
  "dev_app_user",
  "postgres_backup_user",
  "shared_app_user",
];
const clusterSeeds = new Map();

rememberCluster({ database: platformDatabase, host: adminHost, port: adminPort });

const platform = await connect({
  database: platformDatabase,
  host: adminHost,
  port: adminPort,
});

try {
  await configureClusterRoles(platform);
  await configurePlatformDatabase(platform);

  const organisations = await platform.query(`
    select id, slug, tenancy_mode, schema_name, database_host,
           coalesce(database_port, 5432) as database_port, database_name
    from organisations
    where is_active = true
    order by slug
  `);

  const configuredTargets = new Set();
  for (const organisation of organisations.rows) {
    const target = tenantTarget(organisation);
    const key = `${target.host}:${target.port}/${target.database}/${target.schema}`;
    if (!configuredTargets.has(key)) {
      rememberCluster(target);
      const tenant = await connect(target);
      try {
        await configureClusterRoles(tenant);
        await configureTenantDatabase(tenant, target.schema);
      } finally {
        await tenant.end();
      }
      configuredTargets.add(key);
      console.log(`[database-access] configured tenant ${organisation.slug}`);
    }
  }

  await platform.query(
    `
      update organisations
      set database_user = $1, database_password = $2, updated_at = now()
      where tenancy_mode = 'database'
    `,
    [roles.web, webPassword],
  );

  if (env.BACKUP_CATALOG_DATABASE) {
    const catalogueTarget = {
      database: env.BACKUP_CATALOG_DATABASE,
      host: value("BACKUP_CATALOG_HOST", adminHost),
      port: portValue("BACKUP_CATALOG_PORT", adminPort),
    };
    rememberCluster(catalogueTarget);
    const catalogue = await connect(catalogueTarget);
    try {
      await configureClusterRoles(catalogue);
      await configureBackupCatalogue(catalogue);
      console.log("[database-access] configured backup catalogue");
    } finally {
      await catalogue.end();
    }
  }
} finally {
  await platform.end();
}

if (removeLegacyRoles) {
  for (const target of clusterSeeds.values()) {
    await retireLegacyRoles(target);
  }
}

console.log("[database-access] complete");

async function configureClusterRoles(client) {
  for (const role of [
    roles.platform,
    roles.tenant,
    roles.backupCatalogue,
    roles.backupRestore,
  ]) {
    await ensureGroupRole(client, role);
  }

  await ensureLoginRole(client, roles.web, webPassword);
  await ensureLoginRole(client, roles.backup, backupPassword);
  await client.query(
    `grant ${identifierList([
      roles.platform,
      roles.tenant,
      roles.backupCatalogue,
    ])} to ${identifier(roles.web)}`,
  );
  await client.query(
    `grant ${identifierList([
      roles.backupCatalogue,
      roles.backupRestore,
    ])} to ${identifier(roles.backup)}`,
  );
}

async function configurePlatformDatabase(client) {
  await client.query(`grant connect on database ${identifier(platformDatabase)} to ${identifier(roles.platform)}, ${identifier(roles.backupRestore)}`);
  await client.query(`grant usage on schema public to ${identifier(roles.platform)}, ${identifier(roles.backupRestore)}`);
  await client.query(`revoke all privileges on all tables in schema public from ${identifier(roles.platform)}`);
  await client.query(`revoke all privileges on all sequences in schema public from ${identifier(roles.platform)}`);
  await client.query(`alter default privileges in schema public revoke all privileges on tables from ${identifier(roles.platform)}`);
  await client.query(`alter default privileges in schema public revoke all privileges on sequences from ${identifier(roles.platform)}`);
  await client.query(`grant select on organisations to ${identifier(roles.platform)}`);
  await client.query(`grant select, insert, update, delete on platform_announcements to ${identifier(roles.platform)}`);
  await client.query(`grant select on organisations to ${identifier(roles.backupRestore)}`);
  await client.query(`grant update (maintenance_mode, maintenance_message, updated_at) on organisations to ${identifier(roles.backupRestore)}`);
  console.log("[database-access] configured platform database");
}

async function configureBackupCatalogue(client) {
  const database = client.database;
  await client.query(`grant connect on database ${identifier(database)} to ${identifier(roles.backupCatalogue)}`);
  await client.query(`grant usage on schema public to ${identifier(roles.backupCatalogue)}`);
  await client.query(`grant select on tenant_backups, backup_jobs to ${identifier(roles.backupCatalogue)}`);
  await client.query(`grant insert on backup_jobs to ${identifier(roles.backupCatalogue)}`);
  await client.query(`grant select, insert, update on tenant_backups, backup_jobs to ${identifier(roles.backupRestore)}`);
}

async function configureTenantDatabase(client, schemaName) {
  const schema = identifier(schemaName);
  const database = identifier(client.database);
  await client.query(`grant connect on database ${database} to ${identifier(roles.tenant)}, ${identifier(roles.backupRestore)}`);
  await client.query(`alter schema ${schema} owner to ${identifier(roles.backupRestore)}`);
  await client.query(`grant usage on schema ${schema} to ${identifier(roles.tenant)}`);
  await client.query(`grant usage, create on schema ${schema} to ${identifier(roles.backupRestore)}`);

  const ownedObjects = await client.query(
    `
      select c.relkind, c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = $1
        and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
      order by c.relkind, c.relname
    `,
    [schemaName],
  );
  for (const object of ownedObjects.rows) {
    const objectType = relationObjectType(object.relkind);
    await client.query(
      `alter ${objectType} ${schema}.${identifier(object.relname)} owner to ${identifier(roles.backupRestore)}`,
    );
  }

  const routines = await client.query(
    `
      select p.prokind, p.proname, pg_get_function_identity_arguments(p.oid) as arguments
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = $1
        and not exists (
          select 1
          from pg_depend d
          where d.classid = 'pg_proc'::regclass
            and d.objid = p.oid
            and d.deptype = 'e'
        )
    `,
    [schemaName],
  );
  for (const routine of routines.rows) {
    const type = routine.prokind === "p" ? "procedure" : "function";
    await client.query(
      `alter ${type} ${schema}.${identifier(routine.proname)}(${routine.arguments}) owner to ${identifier(roles.backupRestore)}`,
    );
  }

  await client.query(`grant select, insert, update, delete on all tables in schema ${schema} to ${identifier(roles.tenant)}`);
  await client.query(`grant usage, select, update on all sequences in schema ${schema} to ${identifier(roles.tenant)}`);
  await client.query(`grant all privileges on all tables in schema ${schema} to ${identifier(roles.backupRestore)}`);
  await client.query(`grant all privileges on all sequences in schema ${schema} to ${identifier(roles.backupRestore)}`);
  await client.query(`alter default privileges in schema ${schema} grant select, insert, update, delete on tables to ${identifier(roles.tenant)}`);
  await client.query(`alter default privileges in schema ${schema} grant usage, select, update on sequences to ${identifier(roles.tenant)}`);
  await client.query(`alter default privileges for role ${identifier(roles.backupRestore)} in schema ${schema} grant select, insert, update, delete on tables to ${identifier(roles.tenant)}`);
  await client.query(`alter default privileges for role ${identifier(roles.backupRestore)} in schema ${schema} grant usage, select, update on sequences to ${identifier(roles.tenant)}`);
}

async function ensureGroupRole(client, role) {
  const exists = await roleExists(client, role);
  if (!exists) {
    await client.query(`create role ${identifier(role)} nologin`);
  }
  await client.query(`alter role ${identifier(role)} nologin inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls`);
}

async function ensureLoginRole(client, role, password) {
  const exists = await roleExists(client, role);
  if (!exists) {
    await client.query(`create role ${identifier(role)} login`);
  }
  await client.query(
    `alter role ${identifier(role)} login inherit password ${literal(password)} nosuperuser nocreatedb nocreaterole noreplication nobypassrls`,
  );
}

async function retireLegacyRoles(seedTarget) {
  const seed = await connect(seedTarget);
  let databases;
  try {
    databases = await seed.query(`
      select datname
      from pg_database
      where datallowconn = true
        and datistemplate = false
      order by datname
    `);
    await seed.query(
      `select pg_terminate_backend(pid)
       from pg_stat_activity
       where usename = any($1)
         and pid <> pg_backend_pid()`,
      [legacyRoles],
    );
  } finally {
    await seed.end();
  }

  for (const database of databases.rows) {
    const client = await connect({ ...seedTarget, database: database.datname });
    try {
      for (const role of legacyRoles) {
        if (!(await roleExists(client, role))) continue;
        await client.query(
          `reassign owned by ${identifier(role)} to ${identifier(adminUser)}`,
        );
        await client.query(`drop owned by ${identifier(role)}`);
      }
    } finally {
      await client.end();
    }
  }

  const cluster = await connect(seedTarget);
  try {
    for (const role of legacyRoles) {
      if (!(await roleExists(cluster, role))) continue;
      await cluster.query(`drop role ${identifier(role)}`);
      console.log(`[database-access] removed legacy role ${role}`);
    }
  } finally {
    await cluster.end();
  }
}

async function roleExists(client, role) {
  const result = await client.query(
    "select 1 from pg_roles where rolname = $1",
    [role],
  );
  return result.rowCount === 1;
}

function tenantTarget(organisation) {
  if (organisation.tenancy_mode === "schema") {
    return {
      database: required("APP_POSTGRES_DATABASE"),
      host: required("APP_POSTGRES_HOST"),
      port: portValue("APP_POSTGRES_PORT", 5432),
      schema: safeSchema(organisation.schema_name),
    };
  }
  const target = {
    database: String(organisation.database_name || "").trim(),
    host: String(organisation.database_host || "").trim(),
    port: Number(organisation.database_port || 5432),
    schema: "public",
  };
  if (!target.database || !target.host) {
    throw new Error(`Organisation ${organisation.slug} has an incomplete database target.`);
  }
  if (!Number.isInteger(target.port) || target.port < 1 || target.port > 65535) {
    throw new Error(`Organisation ${organisation.slug} has an invalid database port.`);
  }
  return target;
}

async function connect(target) {
  const client = new Client({
    database: target.database,
    host: target.host,
    password: adminPassword,
    port: target.port,
    user: adminUser,
  });
  await client.connect();
  return client;
}

function relationObjectType(kind) {
  if (kind === "S") return "sequence";
  if (kind === "v") return "view";
  if (kind === "m") return "materialized view";
  if (kind === "f") return "foreign table";
  return "table";
}

function identifier(valueToQuote) {
  const text = String(valueToQuote || "");
  if (!text) throw new Error("A required PostgreSQL identifier is empty.");
  return `"${text.replaceAll('"', '""')}"`;
}

function identifierList(values) {
  return values.map(identifier).join(", ");
}

function rememberCluster(target) {
  const key = `${target.host}:${target.port}`;
  if (!clusterSeeds.has(key)) {
    clusterSeeds.set(key, {
      database: target.database,
      host: target.host,
      port: target.port,
    });
  }
}

function literal(valueToQuote) {
  return `'${String(valueToQuote).replaceAll("'", "''")}'`;
}

function safeSchema(valueToCheck) {
  const schema = String(valueToCheck || "").trim();
  if (!/^[a-z][a-z0-9_]*$/.test(schema) || schema.startsWith("pg_")) {
    throw new Error(`Invalid tenant schema: ${schema || "missing"}`);
  }
  return schema;
}

function required(name) {
  const configured = String(env[name] || "").trim();
  if (!configured) throw new Error(`Missing required environment variable: ${name}`);
  return configured;
}

function value(name, fallback) {
  const configured = String(env[name] || fallback || "").trim();
  if (!configured) throw new Error(`Missing required environment variable: ${name}`);
  return configured;
}

function portValue(name, fallback) {
  const configured = Number(env[name] || fallback || 5432);
  if (!Number.isInteger(configured) || configured < 1 || configured > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return configured;
}
