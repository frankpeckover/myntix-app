import { headers } from "next/headers";

type RateLimitInput = {
  includeIpAddress?: boolean;
  key: string;
  maxAttempts: number;
  windowMilliseconds: number;
};

export type RateLimitResult =
  | {
      limit: number;
      ok: true;
      remaining: number;
      resetAt: number;
    }
  | {
      limit: number;
      ok: false;
      remaining: 0;
      resetAt: number;
      retryAfterSeconds: number;
    };

type RateLimitBucket = {
  attempts: number;
  resetAt: number;
};

const secondsPerMillisecond = 1000;
const fallbackIpAddress = "unknown";
const maxRateLimitBuckets = 10_000;

declare global {
  var appRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

export async function consumeRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const buckets = getRateLimitBuckets();
  const now = Date.now();
  pruneRateLimitBuckets(buckets, now);
  const bucketKey = await buildBucketKey(
    input.key,
    input.includeIpAddress ?? true,
  );
  const existingBucket = buckets.get(bucketKey);

  if (!existingBucket || existingBucket.resetAt <= now) {
    ensureBucketCapacity(buckets);
    const resetAt = now + input.windowMilliseconds;
    buckets.set(bucketKey, {
      attempts: 1,
      resetAt,
    });

    return {
      limit: input.maxAttempts,
      ok: true,
      remaining: Math.max(0, input.maxAttempts - 1),
      resetAt,
    };
  }

  if (existingBucket.attempts >= input.maxAttempts) {
    return {
      limit: input.maxAttempts,
      ok: false,
      remaining: 0,
      resetAt: existingBucket.resetAt,
      retryAfterSeconds: Math.ceil(
        (existingBucket.resetAt - now) / secondsPerMillisecond,
      ),
    };
  }

  existingBucket.attempts += 1;
  return {
    limit: input.maxAttempts,
    ok: true,
    remaining: Math.max(0, input.maxAttempts - existingBucket.attempts),
    resetAt: existingBucket.resetAt,
  };
}

async function buildBucketKey(key: string, includeIpAddress: boolean) {
  const normalisedKey = key.trim().toLowerCase();

  if (!includeIpAddress) {
    return normalisedKey;
  }

  return `${await getRequestIpAddress()}:${normalisedKey}`;
}

async function getRequestIpAddress() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    fallbackIpAddress
  );
}

function getRateLimitBuckets() {
  if (!globalThis.appRateLimitBuckets) {
    globalThis.appRateLimitBuckets = new Map();
  }

  return globalThis.appRateLimitBuckets;
}

function pruneRateLimitBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
) {
  if (buckets.size < maxRateLimitBuckets) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function ensureBucketCapacity(buckets: Map<string, RateLimitBucket>) {
  while (buckets.size >= maxRateLimitBuckets) {
    const oldestKey = buckets.keys().next().value;

    if (typeof oldestKey !== "string") {
      return;
    }

    buckets.delete(oldestKey);
  }
}
