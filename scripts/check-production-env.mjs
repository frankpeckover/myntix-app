#!/usr/bin/env node

import { loadEnvironment } from "./env-file-loader.mjs";

const requiredVariables = [
  "APP_BASE_URL",
  "APP_ROOT_DOMAIN",
  "LOCAL_ORGANISATION_SLUG",
  "PLATFORM_POSTGRES_DATABASE",
  "PLATFORM_POSTGRES_HOST",
  "PLATFORM_POSTGRES_PASSWORD",
  "PLATFORM_POSTGRES_USER",
  "SESSION_TOKEN_HASH_SECRET",
  "SSO_SECRET_ENCRYPTION_KEY",
  "API_KEY_HASH_SECRET",
];

const schemaTenantVariables = [
  "APP_POSTGRES_DATABASE",
  "APP_POSTGRES_HOST",
  "APP_POSTGRES_PASSWORD",
  "APP_POSTGRES_USER",
];

const recommendedVariables = [
  "EMAIL_FROM",
  "INTERNAL_JOB_SECRET",
  "RESEND_API_KEY",
];

const backupCatalogueVariables = [
  "BACKUP_CATALOG_HOST",
  "BACKUP_CATALOG_DATABASE",
  "BACKUP_CATALOG_USER",
  "BACKUP_CATALOG_PASSWORD",
];

const env = loadEnvironment();
const missingRequired = getMissingVariables(requiredVariables, env);
const missingSchema = getMissingVariables(schemaTenantVariables, env);
const missingRecommended = getMissingVariables(recommendedVariables, env);
const invalidPort = getInvalidPortMessage(env.APP_PORT);
const backupConfigurationError = getOptionalGroupError(
  backupCatalogueVariables,
  env,
  "Backup catalogue",
);
const invalidBackupPort = getInvalidPortMessage(
  env.BACKUP_CATALOG_PORT,
  "BACKUP_CATALOG_PORT",
);

if (
  missingRequired.length > 0 ||
  missingSchema.length > 0 ||
  invalidPort ||
  backupConfigurationError ||
  invalidBackupPort
) {
  console.error("Production environment is not ready.");

  if (missingRequired.length > 0) {
    console.error(`Missing required variables: ${missingRequired.join(", ")}`);
  }

  if (missingSchema.length > 0) {
    console.error(
      `Missing schema tenancy variables: ${missingSchema.join(", ")}`,
    );
    console.error(
      "These are required when any organisation uses tenancy_mode = 'schema'.",
    );
  }

  if (invalidPort) {
    console.error(invalidPort);
  }

  if (backupConfigurationError) {
    console.error(backupConfigurationError);
  }

  if (invalidBackupPort) {
    console.error(invalidBackupPort);
  }

  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn(`Recommended variables not set: ${missingRecommended.join(", ")}`);
}

console.log("Production environment check passed.");

function getMissingVariables(variableNames, env) {
  return variableNames.filter((name) => !String(env[name] ?? "").trim());
}

function getInvalidPortMessage(value, name = "APP_PORT") {
  if (!String(value ?? "").trim()) {
    return null;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return `${name} must be an integer between 1 and 65535.`;
  }

  return null;
}

function getOptionalGroupError(variableNames, env, label) {
  const configured = variableNames.filter((name) => String(env[name] ?? "").trim());
  if (configured.length === 0 || configured.length === variableNames.length) {
    return null;
  }

  const missing = variableNames.filter((name) => !String(env[name] ?? "").trim());
  return `${label} configuration is incomplete. Missing: ${missing.join(", ")}`;
}
