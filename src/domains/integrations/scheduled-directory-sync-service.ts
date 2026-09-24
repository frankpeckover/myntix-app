import type { PoolClient } from "pg";
import {
  connectTenantBySlug,
  listActiveTenantReferences,
} from "@/lib/db";
import { DirectorySyncService } from "@/domains/integrations/directory-sync-service";

export type ScheduledDirectorySyncSummary = {
  organisationsFailed: number;
  organisationsSkipped: number;
  organisationsSucceeded: number;
};

const directorySyncService = new DirectorySyncService();

export class ScheduledDirectorySyncService {
  async runDueSyncs(now = new Date()): Promise<ScheduledDirectorySyncSummary> {
    const tenants = await listActiveTenantReferences();
    const summary: ScheduledDirectorySyncSummary = {
      organisationsFailed: 0,
      organisationsSkipped: 0,
      organisationsSucceeded: 0,
    };

    for (const tenant of tenants) {
      let client: PoolClient | null = null;

      try {
        client = await connectTenantBySlug(tenant.slug);
        const result = await directorySyncService.runScheduledTassSync(
          client,
          now,
        );

        if (result === "succeeded") {
          summary.organisationsSucceeded += 1;
        } else if (result === "failed") {
          summary.organisationsFailed += 1;
        } else {
          summary.organisationsSkipped += 1;
        }
      } catch (error) {
        if (isMissingSyncModuleError(error)) {
          summary.organisationsSkipped += 1;
        } else {
          summary.organisationsFailed += 1;
          console.error(
            `Scheduled directory sync failed for tenant ${tenant.slug}`,
            error,
          );
        }
      } finally {
        client?.release();
      }
    }

    return summary;
  }
}

function isMissingSyncModuleError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}
