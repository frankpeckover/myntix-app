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

test("hold lookup rejects malformed identifiers", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/holds/not-a-uuid");
  assertApiError(result, 400, "invalid_uuid");
});

test("hold creation validates positive amounts", async (t) => {
  if (!requireApiKey(t)) return;
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const result = await apiRequest(`/accounts/${accountId}/holds`, {
    body: { amount: 0, description: "Invalid hold test" },
    idempotencyKey: uniqueIdempotencyKey("invalid-hold"),
    method: "POST",
  });
  assertApiError(result, 400, "invalid_amount");
});

test("hold creation, lookup and release work when write tests are enabled", async (t) => {
  if (!requireApiKey(t)) return;
  if (!apiTestConfig.enableWrites) {
    t.skip("Set API_TEST_ENABLE_WRITES=true to run mutating hold tests.");
    return;
  }
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const hold = await apiRequest(`/accounts/${accountId}/holds`, {
    body: { amount: 1, description: "API integration test hold" },
    idempotencyKey: uniqueIdempotencyKey("hold"),
    method: "POST",
  });
  assertApiSuccess(hold, 201);

  const lookup = await apiRequest(`/holds/${hold.payload.data.holdId}`);
  assertApiSuccess(lookup);

  const release = await apiRequest(`/holds/${hold.payload.data.holdId}/release`, {
    body: { description: "Automated integration test cleanup" },
    idempotencyKey: uniqueIdempotencyKey("release"),
    method: "POST",
  });
  assertApiSuccess(release);
});
