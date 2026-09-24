import { NextResponse } from "next/server";
import { getActiveMaintenanceMessage } from "@/domains/operations/platform-announcement-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const requestsPerMinute = 120;
const windowMilliseconds = 60_000;

export async function GET() {
  const rateLimit = await consumeRateLimit({
    key: "platform-announcement",
    maxAttempts: requestsPerMinute,
    windowMilliseconds,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { message: "" },
      {
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  return NextResponse.json(
    { message: await getActiveMaintenanceMessage() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
