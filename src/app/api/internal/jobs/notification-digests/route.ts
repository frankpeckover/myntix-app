import { NotificationDigestService } from "@/domains/notifications/notification-digest-service";
import { handleInternalJob } from "@/lib/api/internal-job-route";

const notificationDigestService = new NotificationDigestService();

export async function POST(request: Request) {
  return handleInternalJob(
    request,
    "notification-digests",
    "NOTIFICATION_JOB_SECRET",
    () => notificationDigestService.sendDueDigests(),
  );
}
