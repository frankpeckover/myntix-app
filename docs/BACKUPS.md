# PostgreSQL tenant backups

Run `backup-postgres-tenants.sh` on a host with PostgreSQL client tools. Its PostgreSQL login must have read access to the platform and every tenant database, and sufficient rights for `pg_dumpall --globals-only`. Prefer a dedicated backup role; do not use the web app's tenant credentials. Set libpq credentials with a restricted `~/.pgpass` file or `PGUSER`/`PGPASSWORD`.

```bash
export PLATFORM_DATABASE=ledger_platform_database
export SHARED_DATABASE=myntix_app
export BACKUP_DIR=/var/backups/myntix
export RCLONE_REMOTE=encrypted-r2:myntix-backups
bash scripts/backup-postgres-tenants.sh
```

Omit `SHARED_DATABASE` when there are no schema tenants. Omit `RCLONE_REMOTE` to create local dumps without uploading. Configure `encrypted-r2` as an **rclone crypt** remote backed by a private R2 bucket; raw dumps contain sensitive student data. The script does not load the app `.env` file or use tenant passwords from the platform table.

Each dated backup contains a custom-format platform dump, one custom-format dump for each distinct dedicated tenant database, one full shared-database dump if schema tenants exist, PostgreSQL globals, a tenant inventory without credentials, a target manifest, and SHA-256 checksums. All organisations are included, even inactive ones. A failed dump stops the upload. Keep local/R2 retention separately and test restores regularly.

For schema tenants, a full shared-database dump is the simpler disaster-recovery backup. `pg_restore -l shared-schemas.dump` lets you inspect its contents, and `pg_restore -n schema_name ... shared-schemas.dump` can restore one schema into an empty target database. This is **not** a guaranteed in-place restore: cross-schema dependencies, extensions, globals, and existing objects may require additional work. Restore to a separate test database first, verify it, then plan the production replacement.
