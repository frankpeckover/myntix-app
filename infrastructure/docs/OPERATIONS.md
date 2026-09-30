# Operations Status Contract

The admin dashboard reads operational signals from tenant audit, error, and API
request logs. Tenant backup state comes exclusively from the separate backup
catalogue database, so credentials and storage metadata never enter a tenant
database.

See `infrastructure/docs/BACKUPS.md` for the scheduler, worker, retention, and restore design.
