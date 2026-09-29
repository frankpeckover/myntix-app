#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const workerId = `${hostname()}-${process.pid}`;
const pollingMilliseconds = numberEnvironment("BACKUP_WORKER_POLL_SECONDS", 10) * 1000;
const leaseMinutes = numberEnvironment("BACKUP_WORKER_LEASE_MINUTES", 120);
const retentionDays = nonNegativeIntegerEnvironment("BACKUP_RETENTION_DAYS", 7);
const localRoot = environment("BACKUP_LOCAL_DIR", "/var/lib/myntix-backup-worker");
const rcloneRemote = requiredEnvironment("BACKUP_RCLONE_REMOTE").replace(/\/$/, "");
const runOnce = process.env.BACKUP_WORKER_ONCE === "true";
let isStopping = false;
let lastRetentionCleanup = 0;
const retentionCleanupIntervalMilliseconds = 6 * 60 * 60 * 1000;

const cataloguePool = postgresPool("BACKUP_WORKER_CATALOG");
const platformPool = postgresPool("BACKUP_WORKER_PLATFORM");

process.on("SIGINT", () => { isStopping = true; });
process.on("SIGTERM", () => { isStopping = true; });

await mkdir(localRoot, { recursive: true });
console.log(`[backup-worker] started as ${workerId}`);

do {
  if (Date.now() - lastRetentionCleanup >= retentionCleanupIntervalMilliseconds) {
    await cleanupExpiredBackups();
    lastRetentionCleanup = Date.now();
  }

  const job = await claimJob();
  if (!job) {
    if (runOnce) break;
    await wait(pollingMilliseconds);
    continue;
  }

  const stopLeaseHeartbeat = startLeaseHeartbeat(job.id);
  try {
    const organisation = await loadOrganisation(job);
    if (job.job_type === "backup") {
      await updateJobPhase(job.id, "creating_dump");
      await createTenantBackup(organisation, job.source, job.requested_by_user_id, job.id);
    } else {
      await restoreTenantBackup(job, organisation);
    }
    await completeJob(job.id, "succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backup worker failure.";
    console.error(`[backup-worker] job ${job.id} failed: ${message}`);
    await completeJob(job.id, "failed", message);
  } finally {
    stopLeaseHeartbeat();
  }
} while (!isStopping);

await Promise.allSettled([cataloguePool.end(), platformPool.end()]);
console.log("[backup-worker] stopped");

async function claimJob() {
  const client = await cataloguePool.connect();
  try {
    await client.query("begin");
    await client.query(`
      update backup_jobs
      set status = 'queued', phase = 'queued', worker_id = null,
          lease_expires_at = null, started_at = null
      where status = 'running' and lease_expires_at < now()
    `);
    const result = await client.query(`
      select id, organisation_id, organisation_slug, organisation_name,
             job_type, source, backup_id, requested_by_user_id
      from backup_jobs
      where status = 'queued'
      order by requested_at
      for update skip locked
      limit 1
    `);
    const job = result.rows[0];
    if (!job) {
      await client.query("commit");
      return null;
    }
    await client.query(
      `
        update backup_jobs
        set status = 'running', phase = 'starting', worker_id = $2,
            started_at = coalesce(started_at, now()),
            lease_expires_at = now() + ($3::int * interval '1 minute'),
            error_message = null
        where id = $1
      `,
      [job.id, workerId, leaseMinutes],
    );
    await client.query("commit");
    return job;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function loadOrganisation(job) {
  const result = await platformPool.query(
    `
      select id, slug, name, tenancy_mode, schema_name,
             database_host, database_port, database_name, database_user,
             is_active
      from organisations
      where id = $1 and slug = $2
      limit 1
    `,
    [job.organisation_id, job.organisation_slug],
  );
  const organisation = result.rows[0];
  if (!organisation || !organisation.is_active) {
    throw new Error("The organisation is unavailable or inactive.");
  }
  return organisation;
}

async function createTenantBackup(organisation, source, requestedByUserId, jobId) {
  const backupResult = await cataloguePool.query(
    `
      insert into tenant_backups (
        organisation_id, organisation_slug, organisation_name, tenancy_mode,
        source, created_by_user_id, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id, created_at
    `,
    [
      organisation.id,
      organisation.slug,
      organisation.name,
      tenancyMode(organisation),
      source,
      requestedByUserId,
      JSON.stringify(jobId ? { jobId } : {}),
    ],
  );
  const backup = backupResult.rows[0];
  const workDirectory = join(localRoot, backup.id);
  const dumpPath = join(workDirectory, "tenant.dump");
  const target = tenantTarget(organisation);

  await mkdir(workDirectory, { recursive: true });
  try {
    await runPostgresCommand(
      "pg_dump",
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--host", target.host,
        "--port", String(target.port),
        "--username", target.workerUser,
        "--file", dumpPath,
        ...(target.schemaName ? ["--schema", target.schemaName] : []),
        target.database,
      ],
      target.workerPassword,
    );

    if (jobId) await updateJobPhase(jobId, "uploading");
    const checksum = await sha256File(dumpPath);
    const fileSize = (await stat(dumpPath)).size;
    const datePrefix = backup.created_at.toISOString().slice(0, 10);
    const storageKey = `tenants/${organisation.slug}/${datePrefix}/${backup.id}/tenant.dump`;
    const remotePath = `${rcloneRemote}/${storageKey}`;
    const remoteDirectory = dirname(remotePath).replaceAll("\\", "/");

    await runCommand("rclone", ["copyto", dumpPath, remotePath, "--immutable"]);
    if (jobId) await updateJobPhase(jobId, "verifying");
    await runCommand("rclone", ["check", workDirectory, remoteDirectory, "--one-way"]);

    await cataloguePool.query(
      `
        update tenant_backups
        set status = 'available', storage_key = $2, checksum_sha256 = $3,
            size_bytes = $4, completed_at = now()
        where id = $1 and status = 'creating'
      `,
      [backup.id, storageKey, checksum, fileSize],
    );
    return backup.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await cataloguePool.query(
      `update tenant_backups set status = 'failed', failure_message = $2, completed_at = now() where id = $1`,
      [backup.id, message],
    );
    throw error;
  } finally {
    await rm(workDirectory, { force: true, recursive: true });
  }
}

async function restoreTenantBackup(job, organisation) {
  const requestedBackup = await cataloguePool.query(
    `
      select id, storage_key, checksum_sha256
      from tenant_backups
      where id = $1 and organisation_id = $2 and status = 'available'
      limit 1
    `,
    [job.backup_id, organisation.id],
  );
  const restorePoint = requestedBackup.rows[0];
  if (!restorePoint) throw new Error("The requested restore point is unavailable.");

  await setMaintenance(organisation.id, true);
  let safetyBackupId = null;
  try {
    await updateJobPhase(job.id, "creating_safety_backup");
    safetyBackupId = await createTenantBackup(
      organisation,
      "pre_restore",
      job.requested_by_user_id,
      job.id,
    );
    await updateJobMetadata(job.id, { safetyBackupId });
    await restoreCatalogueBackup(job.id, organisation, restorePoint);
    await setMaintenance(organisation.id, false);
  } catch (restoreError) {
    if (!safetyBackupId) {
      await setMaintenance(organisation.id, false);
      throw restoreError;
    }

    try {
      await updateJobPhase(job.id, "rolling_back");
      const safetyBackup = await cataloguePool.query(
        `select id, storage_key, checksum_sha256 from tenant_backups where id = $1 and status = 'available'`,
        [safetyBackupId],
      );
      await restoreCatalogueBackup(job.id, organisation, safetyBackup.rows[0], false);
      await setMaintenance(organisation.id, false);
      throw new Error(`Restore failed and the safety backup was reapplied: ${errorMessage(restoreError)}`);
    } catch (rollbackError) {
      if (rollbackError instanceof Error && rollbackError.message.startsWith("Restore failed and")) {
        throw rollbackError;
      }
      throw new Error(
        `Restore and automatic rollback failed. The tenant remains in maintenance mode. Restore error: ${errorMessage(restoreError)}. Rollback error: ${errorMessage(rollbackError)}`,
      );
    }
  }
}

async function cleanupExpiredBackups() {
  if (retentionDays === 0) return;

  try {
    const result = await cataloguePool.query(
      `
        select id, storage_key
        from tenant_backups backups
        where backups.status = 'available'
          and backups.completed_at < now() - ($1::int * interval '1 day')
          and not exists (
            select 1
            from backup_jobs jobs
            where jobs.backup_id = backups.id
              and jobs.status in ('queued', 'running')
          )
        order by backups.completed_at
        limit 100
      `,
      [retentionDays],
    );

    for (const backup of result.rows) {
      if (!backup.storage_key) continue;
      await runCommand("rclone", [
        "deletefile",
        `${rcloneRemote}/${backup.storage_key}`,
      ]);
      await cataloguePool.query(
        `
          update tenant_backups
          set status = 'deleted', metadata = metadata || $2::jsonb
          where id = $1 and status = 'available'
        `,
        [backup.id, JSON.stringify({ deletedByRetentionAt: new Date().toISOString() })],
      );
      console.log(`[backup-worker] removed expired restore point ${backup.id}`);
    }
  } catch (error) {
    console.error(`[backup-worker] retention cleanup failed: ${errorMessage(error)}`);
  }
}

async function restoreCatalogueBackup(jobId, organisation, backup, updatePhase = true) {
  if (!backup?.storage_key || !backup?.checksum_sha256) {
    throw new Error("The restore point has incomplete storage metadata.");
  }
  const workDirectory = join(localRoot, `${jobId}-restore`);
  const dumpPath = join(workDirectory, "tenant.dump");
  await rm(workDirectory, { force: true, recursive: true });
  await mkdir(workDirectory, { recursive: true });
  try {
    if (updatePhase) await updateJobPhase(jobId, "downloading");
    await runCommand("rclone", ["copyto", `${rcloneRemote}/${backup.storage_key}`, dumpPath]);
    const checksum = await sha256File(dumpPath);
    if (checksum !== backup.checksum_sha256) {
      throw new Error("The downloaded restore point failed checksum verification.");
    }

    if (updatePhase) await updateJobPhase(jobId, "restoring");
    const target = tenantTarget(organisation);
    await runPostgresCommand(
      "pg_restore",
      [
        "--clean",
        "--if-exists",
        "--exit-on-error",
        "--single-transaction",
        "--no-owner",
        "--no-privileges",
        "--host", target.host,
        "--port", String(target.port),
        "--username", target.workerUser,
        ...(target.schemaName ? ["--schema", target.schemaName] : []),
        "--dbname", target.database,
        dumpPath,
      ],
      target.workerPassword,
    );
    await applyPostRestoreAccess(target);
  } finally {
    await rm(workDirectory, { force: true, recursive: true });
  }
}

async function applyPostRestoreAccess(target) {
  const pool = new Pool({
    database: target.database,
    host: target.host,
    password: target.workerPassword,
    port: target.port,
    user: target.workerUser,
  });
  const client = await pool.connect();
  const schema = quoteIdentifier(target.schemaName || "public");
  const appUser = quoteIdentifier(target.appUser);
  try {
    await client.query("begin");
    await client.query(`grant usage on schema ${schema} to ${appUser}`);
    await client.query(`grant select, insert, update, delete on all tables in schema ${schema} to ${appUser}`);
    await client.query(`grant usage, select, update on all sequences in schema ${schema} to ${appUser}`);
    await client.query(`delete from ${schema}.user_sessions`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function tenantTarget(organisation) {
  const mode = tenancyMode(organisation);
  if (mode === "schema") {
    return {
      appUser: requiredEnvironment("BACKUP_SHARED_APP_USER"),
      database: requiredEnvironment("BACKUP_SHARED_DATABASE"),
      host: requiredEnvironment("BACKUP_SHARED_HOST"),
      port: numberEnvironment("BACKUP_SHARED_PORT", 5432),
      schemaName: validateIdentifier(organisation.schema_name, "schema"),
      workerPassword: requiredEnvironment("BACKUP_PG_PASSWORD"),
      workerUser: requiredEnvironment("BACKUP_PG_USER"),
    };
  }
  const host = String(organisation.database_host || "").trim();
  if (!host) throw new Error("The tenant database host is missing.");

  const port = Number(organisation.database_port || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("The tenant database port is invalid.");
  }

  return {
    appUser: validateIdentifier(organisation.database_user, "database user"),
    database: validateIdentifier(organisation.database_name, "database"),
    host,
    port,
    schemaName: null,
    workerPassword: requiredEnvironment("BACKUP_PG_PASSWORD"),
    workerUser: requiredEnvironment("BACKUP_PG_USER"),
  };
}

function tenancyMode(organisation) {
  return organisation.tenancy_mode === "schema" ? "schema" : "database";
}

async function updateJobPhase(jobId, phase) {
  await cataloguePool.query(
    `
      update backup_jobs
      set phase = $2, lease_expires_at = now() + ($3::int * interval '1 minute')
      where id = $1 and status = 'running' and worker_id = $4
    `,
    [jobId, phase, leaseMinutes, workerId],
  );
}

function startLeaseHeartbeat(jobId) {
  const intervalMilliseconds = Math.min(
    60_000,
    Math.max(10_000, Math.floor((leaseMinutes * 60_000) / 3)),
  );
  const interval = setInterval(() => {
    void cataloguePool
      .query(
        `
          update backup_jobs
          set lease_expires_at = now() + ($2::int * interval '1 minute')
          where id = $1 and status = 'running' and worker_id = $3
        `,
        [jobId, leaseMinutes, workerId],
      )
      .catch((error) => {
        console.error(
          `[backup-worker] could not renew lease for job ${jobId}: ${errorMessage(error)}`,
        );
      });
  }, intervalMilliseconds);
  interval.unref();
  return () => clearInterval(interval);
}

async function updateJobMetadata(jobId, metadata) {
  await cataloguePool.query(
    `update backup_jobs set metadata = metadata || $2::jsonb where id = $1`,
    [jobId, JSON.stringify(metadata)],
  );
}

async function completeJob(jobId, status, error = null) {
  await cataloguePool.query(
    `
      update backup_jobs
      set status = $2, phase = $2, error_message = $3,
          completed_at = now(), lease_expires_at = null
      where id = $1 and status = 'running' and worker_id = $4
    `,
    [jobId, status, error, workerId],
  );
}

async function setMaintenance(organisationId, enabled) {
  await platformPool.query(
    `
      update organisations
      set maintenance_mode = $2,
          maintenance_message = case when $2 then 'A tenant restore is currently in progress.' else null end,
          updated_at = now()
      where id = $1
    `,
    [organisationId, enabled],
  );
}

async function runPostgresCommand(command, args, password) {
  await runCommand(command, args, { PGPASSWORD: password });
}

function runCommand(command, args, extraEnvironment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnvironment },
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let standardError = "";
    child.stderr.on("data", (chunk) => {
      standardError += chunk.toString();
      if (standardError.length > 8000) standardError = standardError.slice(-8000);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${standardError.trim()}`));
    });
  });
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function postgresPool(prefix) {
  return new Pool({
    database: requiredEnvironment(`${prefix}_DATABASE`),
    host: requiredEnvironment(`${prefix}_HOST`),
    password: requiredEnvironment(`${prefix}_PASSWORD`),
    port: numberEnvironment(`${prefix}_PORT`, 5432),
    user: requiredEnvironment(`${prefix}_USER`),
  });
}

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function environment(name, fallback) {
  return String(process.env[name] || fallback).trim() || fallback;
}

function numberEnvironment(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
}

function nonNegativeIntegerEnvironment(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
}

function validateIdentifier(value, label) {
  const identifier = String(value || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return identifier;
}

function quoteIdentifier(value) {
  return `"${validateIdentifier(value, "PostgreSQL")}"`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unknown failure";
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
