import assert from "node:assert/strict";
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

test("reward catalogue returns an array", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/rewards");
  assertApiSuccess(result);
  assert.ok(Array.isArray(result.payload.data.rewards));
});

test("purchase lookup rejects malformed identifiers", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/purchases/not-a-uuid");
  assertApiError(result, 400, "invalid_uuid");
});

test("purchase creation validates account and reward identifiers", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/purchases", {
    body: { accountId: "invalid", rewardId: "invalid" },
    idempotencyKey: uniqueIdempotencyKey("invalid-purchase"),
    method: "POST",
  });
  assertApiError(result, 400, "invalid_uuid");
});

test("purchase request and denial work when write tests are enabled", async (t) => {
  if (!requireApiKey(t)) return;
  if (!apiTestConfig.enableWrites || !apiTestConfig.rewardId) {
    t.skip(
      "Set API_TEST_ENABLE_WRITES=true and API_TEST_REWARD_ID to run purchase tests.",
    );
    return;
  }
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const purchase = await apiRequest("/purchases", {
    body: { accountId, rewardId: apiTestConfig.rewardId },
    idempotencyKey: uniqueIdempotencyKey("purchase"),
    method: "POST",
  });
  assertApiSuccess(purchase, 201);

  const denial = await apiRequest(
    `/purchases/${purchase.payload.data.purchaseId}/deny`,
    {
      body: { note: "Automated integration test cleanup" },
      idempotencyKey: uniqueIdempotencyKey("deny"),
      method: "POST",
    },
  );
  assertApiSuccess(denial);
});
