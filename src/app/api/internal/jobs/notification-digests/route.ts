import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { NotificationDigestService } from "@/domains/notifications/notification-digest-service";

const notificationDigestService = new NotificationDigestService();

export async function POST(request: Request) {
  const configuredSecret = process.env.NOTIFICATION_JOB_SECRET?.trim();

  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Notification digest job is not configured." },
      { status: 503 },
    );
  }

  const suppliedSecret = getBearerToken(request.headers.get("authorization"));

  if (!suppliedSecret || !secretsMatch(suppliedSecret, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const summary = await notificationDigestService.sendDailyDigests();
  return NextResponse.json(summary);
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
