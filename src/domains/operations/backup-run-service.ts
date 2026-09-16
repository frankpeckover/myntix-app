import { db } from "@/lib/db";

type StartBackupRunInput = {
  backupType?: "database" | "full";
  destinationLabel: string;
  metadata?: Record<string, unknown>;
};

type CompleteBackupRunInput = {
  checksum?: string;
  errorMessage?: string;
  sizeBytes?: number;
  status: "failed" | "succeeded";
};

export class BackupRunService {
  async start(input: StartBackupRunInput) {
    const result = await db.query<{ id: string }>(
      `
        insert into backup_runs (backup_type, destination_label, metadata)
        values ($1, $2, $3)
        returning id
      `,
      [
        input.backupType ?? "database",
        input.destinationLabel,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    return result.rows[0].id;
  }

  async complete(runId: string, input: CompleteBackupRunInput) {
    const result = await db.query<{ id: string }>(
      `
        update backup_runs
        set status = $2,
            size_bytes = $3,
            checksum = $4,
            error_message = $5,
            completed_at = now()
        where id = $1
          and status = 'running'
        returning id
      `,
      [
        runId,
        input.status,
        input.sizeBytes ?? null,
        input.checksum ?? null,
        input.errorMessage ?? null,
      ],
    );

    if (result.rowCount !== 1) {
      throw new Error("The backup run was not found or is already complete.");
    }
  }
}
