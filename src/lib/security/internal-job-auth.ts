import { createHash, timingSafeEqual } from "crypto";

export type InternalJobAuthResult =
  | { ok: true }
  | { error: string; ok: false; status: 401 | 503 };

export function authenticateInternalJob(
  request: Request,
  specificSecretName: string,
): InternalJobAuthResult {
  const configuredSecret =
    process.env.INTERNAL_JOB_SECRET?.trim() ||
    process.env[specificSecretName]?.trim();

  if (!configuredSecret) {
    return {
      error: "Internal jobs are not configured.",
      ok: false,
      status: 503,
    };
  }

  const suppliedSecret = getBearerToken(request.headers.get("authorization"));

  if (!suppliedSecret || !secretsMatch(suppliedSecret, configuredSecret)) {
    return { error: "Unauthorised.", ok: false, status: 401 };
  }

  return { ok: true };
}

function getBearerToken(value: string | null) {
  const prefix = "Bearer ";
  return value?.startsWith(prefix) ? value.slice(prefix.length).trim() : "";
}

function secretsMatch(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}
