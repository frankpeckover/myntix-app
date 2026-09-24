import { NextResponse } from "next/server";
import { NotificationDigestService } from "@/domains/notifications/notification-digest-service";
import { authenticateInternalJob } from "@/lib/security/internal-job-auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const notificationDigestService = new NotificationDigestService();
const jobRateLimitWindowMilliseconds = 60_000;
const jobRequestsPerMinute = 10;

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({
    key: "internal-api:notification-digests",
    maxAttempts: jobRequestsPerMinute,
    windowMilliseconds: jobRateLimitWindowMilliseconds,
  });

  if (!rateLimit.ok) {
    const response = NextResponse.json(
      { error: "Too many requests." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const authentication = authenticateInternalJob(
    request,
    "NOTIFICATION_JOB_SECRET",
  );

  if (!authentication.ok) {
    const response = NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
    if (authentication.status === 401) {
      response.headers.set("WWW-Authenticate", "Bearer");
    }
    return response;
  }

  const summary = await notificationDigestService.sendDueDigests();
  return NextResponse.json(summary);
}
