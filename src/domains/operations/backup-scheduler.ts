import { ScheduledBackupService } from "@/domains/operations/scheduled-backup-service";

const checkIntervalMilliseconds = 15 * 60 * 1000;
const initialCheckDelayMilliseconds = 45 * 1000;

type SchedulerState = {
  interval: ReturnType<typeof setInterval>;
  startupCheck: ReturnType<typeof setTimeout>;
};

const schedulerGlobal = globalThis as typeof globalThis & {
  __myntixBackupScheduler?: SchedulerState;
};

export function startBackupScheduler() {
  if (schedulerGlobal.__myntixBackupScheduler) return;

  const service = new ScheduledBackupService();
  let running = false;
  const check = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await service.queueDueBackups();
      if (summary.queued > 0 || summary.failed > 0) {
        console.info("Automatic backup scheduling completed.", summary);
      }
    } catch (error) {
      console.error("Automatic backup scheduling failed.", error);
    } finally {
      running = false;
    }
  };

  const startupCheck = setTimeout(() => void check(), initialCheckDelayMilliseconds);
  const interval = setInterval(() => void check(), checkIntervalMilliseconds);
  startupCheck.unref();
  interval.unref();
  schedulerGlobal.__myntixBackupScheduler = { interval, startupCheck };
}
