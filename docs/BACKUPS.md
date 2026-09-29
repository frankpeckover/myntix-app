# Tenant backup and restore service

Myntix uses a separate PostgreSQL catalogue, an app-owned job queue, a
privileged worker, and encrypted R2 object storage. The web app never receives
R2 credentials or PostgreSQL restore privileges.

## Components

- The web app lists restore points and enqueues manual backup or restore jobs.
- The in-app scheduler enqueues one tenant backup at or after 01:00 in each
  organisation's timezone. It catches up after downtime and retries failed
  scheduled jobs up to three times.
- `scripts/backup-worker.mjs` claims jobs and runs `pg_dump`, `pg_restore`, and
  rclone.
- `myntix_backup` stores metadata only. Dump files remain in an rclone crypt
  remote backed by a private R2 bucket.
- The platform database remains under the operator disaster-recovery backup;
  organisation admins cannot restore it.

## Initial setup

1. Create the `myntix_backup` database.
2. Run `database/backup/01-backup-catalogue.sql` against it.
3. Create separate `backup_app_user` and `backup_worker_user` logins and apply
   the grants shown at the bottom of that SQL file.
4. Run `database/platform/01-tenant-maintenance.sql` against the platform
   database.
5. Configure `BACKUP_CATALOG_*` in the web app environment and restart it.
6. Copy `deploy/backup-worker.env.example` to
   `/etc/myntix/backup-worker.env`, restrict it to the worker account, and enter
   real values. Copy the rclone crypt configuration to
   `/etc/myntix/rclone.conf` with the same ownership.
7. Confirm `pg_dump`, `pg_restore`, `rclone`, and Node.js are installed on the
   worker host. The PostgreSQL client major version should be at least the
   server major version.
8. Configure `BACKUP_RCLONE_REMOTE` as an rclone crypt remote, not the raw R2
   remote.

## Worker service

Copy `deploy/systemd/myntix-backup-worker.service` to `/etc/systemd/system/`.
Install the app under `/opt/myntix/app`, or adjust `WorkingDirectory` and
`ExecStart` to match the deployment and `command -v node`,
then run:

```bash
sudo useradd --system --home /var/lib/myntix-backup-worker --shell /usr/sbin/nologin myntix-backup
sudo install -d -o myntix-backup -g myntix-backup -m 700 /var/lib/myntix-backup-worker
sudo install -d -o root -g myntix-backup -m 750 /etc/myntix
sudo chown root:myntix-backup /etc/myntix/backup-worker.env /etc/myntix/rclone.conf
sudo chmod 640 /etc/myntix/backup-worker.env /etc/myntix/rclone.conf
sudo systemctl daemon-reload
sudo systemctl enable --now myntix-backup-worker
sudo journalctl -u myntix-backup-worker -f
```

The worker can also process one queued job for testing:

```bash
set -a
. /etc/myntix/backup-worker.env
set +a
BACKUP_WORKER_ONCE=true npm run backup:worker
```

## Backup workflow

Schema tenants receive a custom-format dump limited to their schema. Dedicated
database tenants receive a custom-format dump of their database. The worker
calculates SHA-256, uploads the dump to R2, verifies the upload with rclone, and
only then marks the restore point available.

Only one backup or restore may be queued or running for an organisation. The
**Backup Now** action has a 15-minute cooldown.

Verified restore points are retained for seven days by default. Set
`BACKUP_RETENTION_DAYS` in the worker environment to another whole number, or
to `0` to disable automatic deletion. Restore points attached to an active
restore job are never removed.

## Restore workflow

An organisation administrator selects a verified restore point and enters the
organisation name. The worker then:

1. enables tenant maintenance mode;
2. creates and verifies a fresh safety backup;
3. downloads and verifies the selected restore point;
4. restores it in one PostgreSQL transaction;
5. reapplies tenant app grants and removes restored sessions;
6. clears maintenance mode.

If restoration fails, the worker automatically reapplies the safety backup. If
both restore and rollback fail, maintenance mode remains enabled and the worker
records the complete failure for operator intervention.

## Required worker privileges

The catalogue worker role can update catalogue jobs and restore points. The
platform worker role needs `SELECT` on `organisations` and `UPDATE` only on
`maintenance_mode`, `maintenance_message`, and `updated_at`. The PostgreSQL
backup role must be able to read tenant objects, restore them, grant access to
the tenant app role, and delete restored sessions. Keep these credentials only
in the worker environment.

The older `scripts/backup-postgres-tenants.sh` remains the independent
whole-platform disaster-recovery backup. It should continue running separately
because self-service tenant backups do not replace platform, globals, or full
infrastructure backups.
