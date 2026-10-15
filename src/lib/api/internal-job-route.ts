import { NextResponse } from "next/server";
import { authenticateInternalJob } from "@/lib/security/internal-job-auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function handleInternalJob(
  request: Request,
  name: string,
  secretName: string,
  run: () => Promise<unknown>,
) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  try {
    const sourceLimit = await consumeRateLimit({
      key: `internal-api:${name}`,
      maxAttempts: 10,
      windowMilliseconds: 60_000,
    });
    if (!sourceLimit.ok) {
      headers["Retry-After"] = String(sourceLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers },
      );
    }
    const authentication = authenticateInternalJob(request, secretName);
    if (!authentication.ok) {
      if (authentication.status === 401) headers["WWW-Authenticate"] = "Bearer";
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status, headers },
      );
    }
    const jobLimit = await consumeRateLimit({
      includeIpAddress: false,
      key: `internal-job:${name}`,
      maxAttempts: 10,
      windowMilliseconds: 60_000,
    });
    if (!jobLimit.ok) {
      headers["Retry-After"] = String(jobLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers },
      );
    }
    return NextResponse.json(await run(), { headers });
  } catch (error) {
    console.error(`Internal job ${name} failed`, error);
    return NextResponse.json(
      { error: "The job could not be completed." },
      { status: 503, headers },
    );
  }
}
