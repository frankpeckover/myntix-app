import test from "node:test";
import {
  apiRequest,
  apiTestConfig,
  assertApiError,
  resolveTestAccountId,
  uniqueIdempotencyKey,
} from "./api-test-client.mjs";

test("read-only keys cannot perform ledger writes", async (t) => {
  if (!apiTestConfig.readOnlyKey || !apiTestConfig.apiKey) {
    t.skip("Set API_TEST_KEY and API_TEST_READ_ONLY_KEY to test scope enforcement.");
    return;
  }
  const accountId = await resolveTestAccountId(t);
  if (!accountId) return;

  const result = await apiRequest(`/accounts/${accountId}/credits`, {
    apiKey: apiTestConfig.readOnlyKey,
    body: { amount: 1, description: "Scope test" },
    idempotencyKey: uniqueIdempotencyKey("scope"),
    method: "POST",
  });
  assertApiError(result, 403, "insufficient_scope");
});
