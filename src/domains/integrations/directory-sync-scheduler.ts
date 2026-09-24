import { ScheduledDirectorySyncService } from "@/domains/integrations/scheduled-directory-sync-service";

const checkIntervalMilliseconds = 15 * 60 * 1000;
const initialCheckDelayMilliseconds = 30 * 1000;

type SchedulerState = {
  interval: ReturnType<typeof setInterval>;
  startupCheck: ReturnType<typeof setTimeout>;
};

const schedulerGlobal = globalThis as typeof globalThis & {
  __myntixDirectorySyncScheduler?: SchedulerState;
};

export function startDirectorySyncScheduler() {
  if (schedulerGlobal.__myntixDirectorySyncScheduler) {
    return;
  }

  const service = new ScheduledDirectorySyncService();
  let running = false;

  const checkForDueSyncs = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      const summary = await service.runDueSyncs();
      if (summary.organisationsSucceeded > 0 || summary.organisationsFailed > 0) {
        console.info("Automatic directory sync check completed.", summary);
      }
    } catch (error) {
      console.error("Automatic directory sync check failed.", error);
    } finally {
      running = false;
    }
  };

  const startupCheck = setTimeout(
    () => void checkForDueSyncs(),
    initialCheckDelayMilliseconds,
  );
  const interval = setInterval(
    () => void checkForDueSyncs(),
    checkIntervalMilliseconds,
  );

  startupCheck.unref();
  interval.unref();
  schedulerGlobal.__myntixDirectorySyncScheduler = { interval, startupCheck };
}
