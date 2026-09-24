import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequest,
  apiTestConfig,
  assertApiError,
  assertApiSuccess,
  requireApiKey,
  resolveTestAccountId,
} from "./api-test-client.mjs";

test("student resolution returns the matching primary account", async (t) => {
  if (!requireApiKey(t)) return;
  if (!apiTestConfig.studentEmail) {
    t.skip("Set API_TEST_STUDENT_EMAIL to test student resolution.");
    return;
  }

  const result = await apiRequest(
    `/students/resolve?email=${encodeURIComponent(apiTestConfig.studentEmail)}`,
  );
  assertApiSuccess(result);
  assert.equal(result.payload.data.student.email, apiTestConfig.studentEmail.toLowerCase());
  assert.ok(result.payload.data.accountId);
});

test("account, balance and ledger reads return stable response shapes", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const account = await apiRequest(`/accounts/${accountId}`);
  const balance = await apiRequest(`/accounts/${accountId}/balance`);
  const ledger = await apiRequest(`/accounts/${accountId}/ledger?limit=5`);

  assertApiSuccess(account);
  assertApiSuccess(balance);
  assertApiSuccess(ledger);
  assert.equal(account.payload.data.accountId, accountId);
  assert.equal(balance.payload.data.accountId, accountId);
  assert.ok(Array.isArray(ledger.payload.data.entries));
});

test("account routes reject malformed identifiers", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/accounts/not-a-uuid/balance");
  assertApiError(result, 400, "invalid_uuid");
});

test("ledger pagination rejects an excessive limit", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const result = await apiRequest(`/accounts/${accountId}/ledger?limit=101`);
  assertApiError(result, 400, "invalid_limit");
});
