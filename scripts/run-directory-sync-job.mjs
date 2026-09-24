#!/usr/bin/env node

import { loadEnvironment } from "./env-file-loader.mjs";

const env = loadEnvironment();
const appBaseUrl = String(env.APP_BASE_URL ?? "").trim().replace(/\/$/, "");
const secret = String(
  env.INTERNAL_JOB_SECRET ?? env.DIRECTORY_SYNC_JOB_SECRET ?? "",
).trim();

if (!appBaseUrl) {
  console.error("APP_BASE_URL is required to run the directory sync job.");
  process.exit(1);
}

if (!secret) {
  console.error("INTERNAL_JOB_SECRET is required to run the directory sync job.");
  process.exit(1);
}

const response = await fetch(
  `${appBaseUrl}/api/internal/jobs/directory-sync`,
  {
    headers: { authorization: `Bearer ${secret}` },
    method: "POST",
    signal: AbortSignal.timeout(30 * 60 * 1000),
  },
);
const body = await response.text();

if (!response.ok) {
  console.error(`Directory sync job failed with HTTP ${response.status}: ${body}`);
  process.exit(1);
}

console.log(body);
