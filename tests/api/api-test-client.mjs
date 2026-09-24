import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const defaultBaseUrl = "http://127.0.0.1:3000/api/v1";

export const apiTestConfig = {
  accountId: process.env.API_TEST_ACCOUNT_ID?.trim() ?? "",
  apiKey: process.env.API_TEST_KEY?.trim() ?? "",
  baseUrl: (process.env.API_TEST_BASE_URL?.trim() || defaultBaseUrl).replace(/\/$/, ""),
  enableWrites: process.env.API_TEST_ENABLE_WRITES === "true",
  readOnlyKey: process.env.API_TEST_READ_ONLY_KEY?.trim() ?? "",
  rewardId: process.env.API_TEST_REWARD_ID?.trim() ?? "",
  runRateLimitTest: process.env.API_TEST_RUN_RATE_LIMIT === "true",
  studentEmail: process.env.API_TEST_STUDENT_EMAIL?.trim() ?? "",
};

export async function apiRequest(
  path,
  {
    apiKey = apiTestConfig.apiKey,
    body,
    headers = {},
    idempotencyKey,
    method = "GET",
    rawBody,
  } = {},
) {
  const requestHeaders = new Headers(headers);

  if (apiKey) {
    requestHeaders.set("Authorization", `Bearer ${apiKey}`);
  }

  if (idempotencyKey) {
    requestHeaders.set("Idempotency-Key", idempotencyKey);
  }

  if (body !== undefined || rawBody !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiTestConfig.baseUrl}${path}`, {
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    headers: requestHeaders,
    method,
    redirect: "manual",
  });
  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  return { payload, response };
}

export function assertApiError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.payload?.ok, false);
  assert.equal(result.payload?.error?.code, code);
  assert.ok(result.response.headers.get("x-request-id"));
}

export function assertApiSuccess(result, status = 200) {
  assert.equal(result.response.status, status);
  assert.equal(result.payload?.ok, true);
  assert.ok(result.payload?.data);
  assert.ok(result.response.headers.get("x-request-id"));
}

export function requireApiKey(testContext) {
  if (!apiTestConfig.apiKey) {
    testContext.skip("Set API_TEST_KEY to run authenticated API tests.");
    return false;
  }

  return true;
}

export async function resolveTestAccountId(testContext) {
  if (apiTestConfig.accountId) {
    return apiTestConfig.accountId;
  }

  if (!apiTestConfig.studentEmail) {
    testContext.skip(
      "Set API_TEST_ACCOUNT_ID or API_TEST_STUDENT_EMAIL for account tests.",
    );
    return "";
  }

  const result = await apiRequest(
    `/students/resolve?email=${encodeURIComponent(apiTestConfig.studentEmail)}`,
  );
  assertApiSuccess(result);
  return result.payload.data.accountId;
}

export function uniqueIdempotencyKey(prefix) {
  return `api-test-${prefix}-${randomUUID()}`;
}
