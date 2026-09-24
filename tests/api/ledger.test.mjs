import test from "node:test";
import {
  apiRequest,
  apiTestConfig,
  assertApiError,
  assertApiSuccess,
  requireApiKey,
  resolveTestAccountId,
  uniqueIdempotencyKey,
} from "./api-test-client.mjs";

test("ledger writes require an idempotency key", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const result = await apiRequest(`/accounts/${accountId}/credits`, {
    body: { amount: 1, description: "API test" },
    method: "POST",
  });
  assertApiError(result, 400, "idempotency_key_required");
});

test("ledger writes validate JSON and amounts without changing balances", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const malformed = await apiRequest(`/accounts/${accountId}/credits`, {
    idempotencyKey: uniqueIdempotencyKey("invalid-json"),
    method: "POST",
    rawBody: "{not-json",
  });
  assertApiError(malformed, 400, "invalid_json");

  const invalidAmount = await apiRequest(`/accounts/${accountId}/credits`, {
    body: { amount: 0, description: "API validation test" },
    idempotencyKey: uniqueIdempotencyKey("invalid-amount"),
    method: "POST",
  });
  assertApiError(invalidAmount, 400, "invalid_amount");
});

test("idempotency replays matching responses and rejects changed requests", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;
  const idempotencyKey = uniqueIdempotencyKey("replay");
  const request = {
    body: { amount: 0, description: "Non-mutating replay test" },
    idempotencyKey,
    method: "POST",
  };

  const first = await apiRequest(`/accounts/${accountId}/credits`, request);
  const replay = await apiRequest(`/accounts/${accountId}/credits`, request);
  const conflict = await apiRequest(`/accounts/${accountId}/credits`, {
    ...request,
    body: { amount: -1, description: "Different request" },
  });

  assertApiError(first, 400, "invalid_amount");
  assertApiError(replay, 400, "invalid_amount");
  assertApiError(conflict, 409, "idempotency_conflict");
});

test("credit and reversal flow works when write tests are enabled", async (t) => {
  if (!requireApiKey(t)) return;
  if (!apiTestConfig.enableWrites) {
    t.skip("Set API_TEST_ENABLE_WRITES=true to run mutating ledger tests.");
    return;
  }
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const credit = await apiRequest(`/accounts/${accountId}/credits`, {
    body: { amount: 1, description: "API integration test credit" },
    idempotencyKey: uniqueIdempotencyKey("credit"),
    method: "POST",
  });
  assertApiSuccess(credit, 201);

  const reversal = await apiRequest(
    `/ledger/entries/${credit.payload.data.entryId}/reverse`,
    {
      body: { reason: "Automated integration test cleanup" },
      idempotencyKey: uniqueIdempotencyKey("reverse"),
      method: "POST",
    },
  );
  assertApiSuccess(reversal, 201);
});
