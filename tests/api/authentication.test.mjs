import test from "node:test";
import {
  apiRequest,
  assertApiError,
  assertApiSuccess,
  requireApiKey,
} from "./api-test-client.mjs";

test("API rejects a missing bearer token", async () => {
  const result = await apiRequest("/rewards", { apiKey: "" });

  assertApiError(result, 401, "invalid_api_key");
  if (result.response.headers.get("www-authenticate") !== "Bearer") {
    throw new Error("401 response did not include WWW-Authenticate: Bearer.");
  }
});

test("API rejects an invalid bearer token", async () => {
  const result = await apiRequest("/rewards", {
    apiKey: "myntix_live_not-a-real-key",
  });

  assertApiError(result, 401, "invalid_api_key");
});

test("authenticated responses expose request and rate-limit metadata", async (t) => {
  if (!requireApiKey(t)) return;

  const result = await apiRequest("/rewards");
  assertApiSuccess(result);

  for (const header of [
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
  ]) {
    if (!result.response.headers.get(header)) {
      throw new Error(`Response did not include ${header}.`);
    }
  }
});
