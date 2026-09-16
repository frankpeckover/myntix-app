# Operations Status Contract

The admin dashboard reads operational signals from existing audit, error, and API
request logs. Backup execution remains external to the web process.

## Backup worker integration

1. Run `database/school/08-operations.sql` for each tenant.
2. Before a backup starts, call `BackupRunService.start()` with a human-readable
   destination label such as `Off-site encrypted storage`.
3. After verification, call `BackupRunService.complete()` with `succeeded` or
   `failed`, plus the size and checksum when available.
4. Keep storage credentials, bucket paths, and encryption keys in the backup
   worker environment. Do not store them in `backup_runs`.

A stale `running` record remains visible as such so monitoring can detect an
interrupted worker. Retention cleanup can remove old successful records later,
but should preserve failures for the organisation's chosen audit period.
