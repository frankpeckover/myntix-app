import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequest,
  apiTestConfig,
  assertApiError,
  requireApiKey,
} from "./api-test-client.mjs";

test("read limit returns 429 and Retry-After when explicitly enabled", async (t) => {
  if (!requireApiKey(t)) return;
  if (!apiTestConfig.runRateLimitTest) {
    t.skip("Set API_TEST_RUN_RATE_LIMIT=true to exhaust the configured read limit.");
    return;
  }

  const expectedLimit = Number(process.env.API_TEST_EXPECTED_READ_LIMIT ?? 300);
  let limitedResult = null;

  for (let requestNumber = 0; requestNumber <= expectedLimit; requestNumber += 1) {
    const result = await apiRequest("/rewards");

    if (result.response.status === 429) {
      limitedResult = result;
      break;
    }
  }

  assert.ok(limitedResult, "The API did not return 429 at the expected limit.");
  assertApiError(limitedResult, 429, "rate_limit_exceeded");
  assert.ok(Number(limitedResult.response.headers.get("retry-after")) > 0);
});
