import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import pg from "pg";
import { parseEnvFile } from "./env-file-loader.mjs";

const environment = loadEnvironment();
const args = process.argv.slice(2);
const executeIndex = args.indexOf("--execute");
const confirmIndex = args.indexOf("--confirm");
const organisationSlug = executeIndex >= 0 ? args[executeIndex + 1] : null;
const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1] : null;

const postgres = {
  host: required("OFFBOARD_POSTGRES_HOST"),
  port: Number(environment.OFFBOARD_POSTGRES_PORT || 5432),
  user: required("OFFBOARD_POSTGRES_USER"),
  password: required("OFFBOARD_POSTGRES_PASSWORD"),
};
const platformDatabase = environment.OFFBOARD_PLATFORM_DATABASE || environment.PLATFORM_POSTGRES_DATABASE || "ledger_platform_database";
const backupDatabase = environment.OFFBOARD_BACKUP_DATABASE || "myntix_backup";
const sharedDatabase = environment.OFFBOARD_SHARED_DATABASE || "myntix_app";
const rcloneRemote = required("OFFBOARD_RCLONE_REMOTE").replace(/\/$/, "");
const rcloneConfig = required("RCLONE_CONFIG");
const appDirectory = resolve(environment.OFFBOARD_APP_DIRECTORY || process.cwd());
const platform = pool(platformDatabase);

try {
  if (!organisationSlug) {
    await listOrganisations();
  } else {
    await executeOffboarding(organisationSlug, confirmation);
  }
} finally {
  await platform.end();
}

async function listOrganisations() {
  const result = await platform.query(`
    select id, name, slug, primary_domain, tenancy_mode
    from organisations
    where is_active = true
    order by name
  `);
  console.table(result.rows.map((row) => ({
    id: row.id,
    organisation: row.name,
    slug: row.slug,
    domain: row.primary_domain,
    tenancy: row.tenancy_mode,
  })));
  console.log("Only action a verified deletion-request email. Run: npm run organisation:offboard -- --execute <slug> --confirm <slug>");
}

async function executeOffboarding(slug, confirmedSlug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || "")) throw new Error("Provide a valid organisation slug.");
  if (confirmedSlug !== slug) throw new Error(`Confirmation mismatch. Pass --confirm ${slug}`);
  const client = await platform.connect();
  let request;
  try {
    await client.query("begin");
    const result = await client.query(`
      select id as organisation_id, slug as organisation_slug, name as organisation_name,
             tenancy_mode, schema_name, database_host, database_port, database_name
      from organisations
      where slug = $1
      for update
    `, [slug]);
    request = result.rows[0];
    if (!request) throw new Error("That active organisation was not found.");
    await client.query(`
      update organisations
      set is_active = false, maintenance_mode = true,
          maintenance_message = 'This organisation is being permanently removed.', updated_at = now()
      where id = $1
    `, [request.organisation_id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  console.log(`[offboard] disabled ${request.organisation_slug}`);
  try {
    const uploadPaths = await collectUploadPaths(request);
    await purgeRemoteBackups(request.organisation_slug);
    await purgeBackupCatalogue(request.organisation_id);
    await removeUploads(uploadPaths);
    await dropTenant(request);
    await platform.query("delete from organisations where id = $1", [request.organisation_id]);
    console.log(`[offboard] permanently removed ${request.organisation_slug}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[offboard] failed after disabling the organisation: ${message}`);
    process.exitCode = 1;
  }
}

async function collectUploadPaths(request) {
  const target = tenantConnection(request);
  const tenant = new pg.Pool(target);
  try {
    const prefix = request.tenancy_mode === "schema" ? `set search_path to ${identifier(request.schema_name)}, public; ` : "";
    const result = await tenant.query(`${prefix}
      select logo_url as path from school_info where logo_url like '/uploads/%'
      union select profile_image_url from users where profile_image_url like '/uploads/%'
      union select image_url from shop_items where image_url like '/uploads/%'
    `);
    return result.rows.map((row) => row.path).filter(Boolean);
  } finally {
    await tenant.end();
  }
}

async function purgeRemoteBackups(slug) {
  console.log(`[offboard] purging encrypted backups for ${slug}`);
  await command("rclone", ["--config", rcloneConfig, "purge", `${rcloneRemote}/tenants/${slug}`]);
}

async function purgeBackupCatalogue(organisationId) {
  const catalogue = pool(backupDatabase);
  try {
    await catalogue.query("begin");
    await catalogue.query("delete from backup_jobs where organisation_id = $1", [organisationId]);
    await catalogue.query("delete from tenant_backups where organisation_id = $1", [organisationId]);
    await catalogue.query("commit");
  } catch (error) {
    await catalogue.query("rollback");
    throw error;
  } finally {
    await catalogue.end();
  }
}

async function dropTenant(request) {
  if (request.tenancy_mode === "schema") {
    const shared = pool(sharedDatabase);
    try {
      await shared.query(`drop schema ${identifier(request.schema_name)} cascade`);
    } finally {
      await shared.end();
    }
    return;
  }

  const maintenance = new pg.Pool({ ...postgres, host: request.database_host || postgres.host, database: "postgres", max: 1 });
  try {
    await maintenance.query(`drop database ${identifier(request.database_name)} with (force)`);
  } finally {
    await maintenance.end();
  }
}

async function removeUploads(paths) {
  const uploadRoot = resolve(appDirectory, "public", "uploads");
  for (const publicPath of paths) {
    const filePath = resolve(appDirectory, "public", publicPath.replace(/^\//, ""));
    if (filePath !== uploadRoot && filePath.startsWith(`${uploadRoot}${sep}`)) {
      await rm(filePath, { force: true });
    }
  }
}

function tenantConnection(request) {
  return {
    ...postgres,
    host: request.database_host || postgres.host,
    port: request.database_port || postgres.port,
    database: request.tenancy_mode === "schema" ? sharedDatabase : request.database_name,
    max: 1,
  };
}

function pool(database) {
  return new pg.Pool({ ...postgres, database, max: 2 });
}

function identifier(value) {
  if (!value || !/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  return `"${value.replaceAll('"', '""')}"`;
}

function command(executable, commandArgs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, commandArgs, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${executable} exited with code ${code}`)));
  });
}

function required(name) {
  const value = environment[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadEnvironment() {
  const loaded = { ...process.env };
  for (const file of ["/etc/myntix/app.env", "/etc/myntix/backup-worker.env", "/etc/myntix/offboarding.env"]) {
    if (existsSync(file)) Object.assign(loaded, parseEnvFile(file));
  }
  return loaded;
}
