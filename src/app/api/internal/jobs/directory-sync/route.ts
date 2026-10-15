import { ScheduledDirectorySyncService } from "@/domains/integrations/scheduled-directory-sync-service";
import { handleInternalJob } from "@/lib/api/internal-job-route";

const scheduledDirectorySyncService = new ScheduledDirectorySyncService();

export async function POST(request: Request) {
  return handleInternalJob(
    request,
    "directory-sync",
    "DIRECTORY_SYNC_JOB_SECRET",
    () => scheduledDirectorySyncService.runDueSyncs(),
  );
}
