#!/usr/bin/env node

import { loadEnvironment } from "./env-file-loader.mjs";

const requiredVariables = [
  "APP_BASE_URL",
  "APP_ROOT_DOMAIN",
  "LOCAL_ORGANISATION_SLUG",
  "PLATFORM_POSTGRES_DATABASE",
  "PLATFORM_POSTGRES_HOST",
  "PLATFORM_POSTGRES_PASSWORD",
  "PLATFORM_POSTGRES_PORT",
  "PLATFORM_POSTGRES_USER",
  "SESSION_TOKEN_HASH_SECRET",
  "SSO_SECRET_ENCRYPTION_KEY",
  "API_KEY_HASH_SECRET",
];

const schemaTenantVariables = [
  "APP_POSTGRES_DATABASE",
  "APP_POSTGRES_HOST",
  "APP_POSTGRES_PASSWORD",
  "APP_POSTGRES_PORT",
  "APP_POSTGRES_USER",
];

const recommendedVariables = [
  "EMAIL_FROM",
  "NEXT_PUBLIC_APP_DESCRIPTION",
  "NEXT_PUBLIC_APP_INITIALS",
  "NEXT_PUBLIC_APP_LOCKUP_URL",
  "NEXT_PUBLIC_APP_LOGO_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_APP_SUPPORT_EMAIL",
  "NEXT_PUBLIC_APP_TAGLINE",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_PUBLIC_APP_WORDMARK_URL",
  "RESEND_API_KEY",
  "NOTIFICATION_JOB_SECRET",
];

const env = loadEnvironment();
const missingRequired = getMissingVariables(requiredVariables, env);
const missingSchema = getMissingVariables(schemaTenantVariables, env);
const missingRecommended = getMissingVariables(recommendedVariables, env);
const invalidPort = getInvalidPortMessage(env.APP_PORT);

if (missingRequired.length > 0 || missingSchema.length > 0 || invalidPort) {
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

  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn(`Recommended variables not set: ${missingRecommended.join(", ")}`);
}

console.log("Production environment check passed.");

function getMissingVariables(variableNames, env) {
  return variableNames.filter((name) => !String(env[name] ?? "").trim());
}

function getInvalidPortMessage(value) {
  if (!String(value ?? "").trim()) {
    return null;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "APP_PORT must be an integer between 1 and 65535.";
  }

  return null;
}
