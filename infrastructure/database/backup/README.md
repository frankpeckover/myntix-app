# Backup catalogue database

Create a separate PostgreSQL database such as `myntix_backup`, then run
`00-catalogue.sql` while connected to it. The catalogue stores metadata
only; encrypted dump files remain in R2.

Database access uses the consolidated accounts created by:

```txt
npm run db:configure-access
```

- `myntix_web` can read backup history and enqueue jobs.
- `myntix_backup` can execute and update backup and restore jobs.

Their permissions come from `NOLOGIN` group roles. The web process must never
receive the worker password, tenant restore privileges, R2 credentials, or
rclone configuration.

The PostgreSQL `postgres` administrator remains available for database setup
and emergency administration, but neither application process uses it.
