# Backup catalogue database

Create a separate PostgreSQL database such as `myntix_backup`, then run
`01-backup-catalogue.sql` while connected to it. The catalogue stores job and
restore-point metadata only. Encrypted dump files remain in R2.

Use separate PostgreSQL login roles:

- `backup_app_user`: `SELECT` on both tables and `INSERT` on `backup_jobs`.
- `backup_worker_user`: `SELECT`, `INSERT`, and `UPDATE` on both tables.

The web app must never receive the worker's PostgreSQL, R2, rclone, or tenant
backup credentials. Configure the web process with `BACKUP_CATALOG_*` and the
worker with `BACKUP_WORKER_CATALOG_*`.

The worker also needs a dedicated platform-database login:

```sql
grant connect on database app_platform to backup_platform_worker;
grant usage on schema public to backup_platform_worker;
grant select on organisations to backup_platform_worker;
grant update (maintenance_mode, maintenance_message, updated_at)
  on organisations to backup_platform_worker;
```
