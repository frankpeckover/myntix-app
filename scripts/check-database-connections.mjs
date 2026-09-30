#!/usr/bin/env node

import { existsSync } from "node:fs";
import pg from "pg";
import { envFileNames, loadEnvironment } from "./env-file-loader.mjs";

const env = loadEnvironment();
const checks = [
  createCheck("platform", "PLATFORM_POSTGRES", "select 1 from organisations limit 1"),
  createCheck("tenant", "APP_POSTGRES", "select 1"),
];

if (hasAnyValue("BACKUP_CATALOG")) {
  checks.push(
    createCheck("backup catalogue", "BACKUP_CATALOG", "select 1 from backup_jobs limit 1"),
  );
}

console.log(
  `Environment files found: ${envFileNames.filter((name) => existsSync(name)).join(", ") || "none"}`,
);

let failed = false;

for (const check of checks) {
  const missing = check.requiredKeys.filter((key) => !env[key]?.trim());

  if (missing.length > 0) {
    failed = true;
    console.error(`${check.label}: missing ${missing.join(", ")}`);
    continue;
  }

  const client = new pg.Client(check.config);

  try {
    await client.connect();
    await client.query(check.query);
    console.log(`${check.label}: connection and read check passed`);
  } catch (error) {
    failed = true;
    const code = error instanceof Error && "code" in error ? ` [${error.code}]` : "";
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error(`${check.label}: failed${code} ${message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (failed) process.exitCode = 1;

function createCheck(label, prefix, query) {
  const requiredKeys = [
    `${prefix}_HOST`,
    `${prefix}_DATABASE`,
    `${prefix}_USER`,
    `${prefix}_PASSWORD`,
  ];

  return {
    config: {
      database: env[`${prefix}_DATABASE`],
      host: env[`${prefix}_HOST`],
      password: env[`${prefix}_PASSWORD`],
      port: Number(env[`${prefix}_PORT`] || 5432),
      user: env[`${prefix}_USER`],
    },
    label,
    query,
    requiredKeys,
  };
}

function hasAnyValue(prefix) {
  return Object.keys(env).some(
    (key) => key.startsWith(`${prefix}_`) && Boolean(env[key]?.trim()),
  );
}
