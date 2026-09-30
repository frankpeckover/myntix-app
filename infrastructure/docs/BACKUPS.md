# Backups

Myntix has one tenant-backup system:

1. The web app queues scheduled, manual, and restore jobs.
2. One private worker uses `pg_dump` or `pg_restore` and uploads encrypted dumps
   to R2 with rclone.
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
5. Put the working rclone crypt configuration at
   `/etc/myntix/rclone.conf` and set its remote in `BACKUP_RCLONE_REMOTE`.
6. Install `pg_dump`, `pg_restore`, `rclone`, and Node.js on the worker host.
7. Install and start `infrastructure/config/backup-worker/myntix-backup-worker.service`.

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
BACKUP_RCLONE_REMOTE=encrypted-r2:myntix-backup
BACKUP_RETENTION_DAYS=7
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
- Restore points are retained for seven days by default.
- A restore first creates a safety backup, enables maintenance mode, restores
  in one transaction, reapplies access, and clears active sessions.
- A failed restore automatically reapplies its safety backup.
