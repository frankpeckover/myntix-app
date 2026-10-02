# Backups

Myntix has one tenant-backup system:

1. The web app queues scheduled, manual, and restore jobs.
2. One private worker uses `pg_dump` or `pg_restore`, encrypts each dump locally
   with `age`, retains a short-lived encrypted local copy, and uploads that same
   encrypted artifact to R2 with rclone.
3. The separate `myntix_backup` database stores the job and restore-point list.

The web app never receives R2 or database-restore credentials.

## One-time setup

1. Create a PostgreSQL database named `myntix_backup` and run
   `infrastructure/database/backup/00-catalogue.sql` against it.
2. Run `npm run db:configure-access` once with PostgreSQL administrator
   credentials. This creates the `myntix_web` and `myntix_backup` accounts and
   grants their access.
3. Add `BACKUP_CATALOG_*` to the web app environment using `myntix_web`, then
   restart the web app.
4. Copy `infrastructure/config/backup-worker/backup-worker.env.example` to
   `/etc/myntix/backup-worker.env`, enter the `myntix_backup` password and the
   three database names.
5. Put the working private R2 configuration at `/etc/myntix/rclone.conf` and set
   its bucket path in `BACKUP_RCLONE_REMOTE`. Do not configure rclone crypt.
6. Generate one backup identity with `age-keygen -o backup-age.key`, store an
   offline copy, and provision that same identity to every worker as
   `/etc/myntix/backup-age.key` (or set `BACKUP_AGE_IDENTITY_SOURCE` before
   running the installer). Without it, neither local nor R2 backups can be
   restored. Do not generate a separate identity for each worker.
7. Install `age`, `pg_dump`, `pg_restore`, `rclone`, and Node.js on the worker host.
8. Install and start `infrastructure/config/backup-worker/myntix-backup-worker.service`.

The worker environment now has one PostgreSQL connection block:

```txt
BACKUP_POSTGRES_HOST=localhost
BACKUP_POSTGRES_PORT=5432
BACKUP_POSTGRES_USER=myntix_backup
BACKUP_POSTGRES_PASSWORD=

BACKUP_CATALOG_DATABASE=myntix_backup
BACKUP_PLATFORM_DATABASE=ledger_platform_database
BACKUP_SHARED_DATABASE=myntix_app
BACKUP_APP_USER=myntix_web

RCLONE_CONFIG=/etc/myntix/rclone.conf
BACKUP_RCLONE_REMOTE=cloudflareR2:myntix-backup
BACKUP_AGE_IDENTITY=/etc/myntix/backup-age.key
BACKUP_LOCAL_DIR=/var/lib/myntix-backup-worker
BACKUP_TEMP_DIR=/run/myntix-backup-worker
BACKUP_LOCAL_RETENTION_DAYS=3
BACKUP_RETENTION_DAYS=14
BACKUP_SAFETY_RETENTION_HOURS=24
```

## Start and test

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myntix-backup-worker
sudo journalctl -u myntix-backup-worker -f
```

In Myntix, open **Admin > Settings > Backups** and select **Backup Now**. A
successful job appears as an available restore point and creates an encrypted
object in R2.

To process one queued job interactively:

```bash
set -a
. /etc/myntix/backup-worker.env
set +a
BACKUP_WORKER_ONCE=true npm run backup:worker
```

## Behaviour

- Scheduled tenant backups are queued after 01:00 in the organisation's local
  timezone.
- Manual backups have a 15-minute cooldown.
- Encrypted local copies are retained for three days by default.
- Encrypted R2 restore points are retained for 14 days by default.
- Pre-restore safety points are retained for 24 hours by default.
- A restore first creates a safety backup, enables maintenance mode, restores
  in one transaction, reapplies access, and clears active sessions.
- A failed restore automatically reapplies its safety backup.
- Plaintext dumps exist only in the worker's runtime directory while being
  created or restored. Durable local files and R2 objects are the same
  `age`-encrypted artifact.
