# Database access model

Myntix uses two PostgreSQL login accounts regardless of tenant count:

- `myntix_web`: normal platform, tenant and backup-queue access.
- `myntix_backup`: isolated backup worker access, including tenant ownership
  required for restore operations.

Permissions are assigned through four `NOLOGIN` group roles:

- `myntix_platform_access`
- `myntix_tenant_access`
- `myntix_backup_catalog_access`
- `myntix_backup_restore_access`

The built-in `postgres` administrator still exists for provisioning,
migrations and emergencies. Neither the web app nor backup worker uses it.

## Configure or migrate

Register tenant targets in the platform `organisations` table, then run:

```bash
export DATABASE_ADMIN_HOST=192.168.1.136
export DATABASE_ADMIN_PORT=5432
export DATABASE_ADMIN_USER=postgres
export DATABASE_ADMIN_PASSWORD='temporary-admin-password'
export MYNTIX_WEB_DATABASE_PASSWORD='permanent-web-password'
export MYNTIX_BACKUP_DATABASE_PASSWORD='permanent-worker-password'
npm run db:configure-access
```

The command is idempotent. It creates or updates both login accounts, applies
least-privilege grants, configures every active tenant, updates dedicated
tenant connection records, and configures the backup catalogue when present.
Do not save `DATABASE_ADMIN_PASSWORD` in the application environment.

Afterward, use the web password for all `PLATFORM_POSTGRES_*`,
`APP_POSTGRES_*`, and `BACKUP_CATALOG_*` connections. The backup worker uses
the worker password once through `BACKUP_POSTGRES_PASSWORD`; see
`infrastructure/config/backup-worker/backup-worker.env.example`.

After every deployed app and worker has switched to the consolidated
credentials, retire the former login roles with:

```bash
npm run db:configure-access -- --remove-legacy-roles
```

This terminates sessions for the known legacy roles, removes their grants in
each database on the configured PostgreSQL clusters, and drops the roles. It
does not remove the PostgreSQL administrator.
