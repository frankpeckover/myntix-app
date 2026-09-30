# Database setup

The SQL is split into independent modules and can be run from DBeaver. Create
each database before running its module; these files do not contain `psql`
connection commands.

## Modules

- `platform/00-core.sql`: tenant routing and platform announcements. Run once
  in the platform database.
- `tenant/*.sql`: tenant data. Run in a dedicated tenant database or with the
  tenant schema first in `search_path`.
- `backup/00-catalogue.sql`: backup metadata and job queue. Run once in the
  separate backup catalogue database.
- `demo/seed-demo-data.sql`: optional demonstration data. Never use it for a
  production organisation.

## Tenant setup

The full tenant module order is:

```txt
infrastructure/database/tenant/00-core-settings.sql
infrastructure/database/tenant/01-auth.sql
infrastructure/database/tenant/02-ledger.sql
infrastructure/database/tenant/03-groups-timetable.sql
infrastructure/database/tenant/04-rewards.sql
infrastructure/database/tenant/05-sso.sql
infrastructure/database/tenant/06-api-clients.sql
infrastructure/database/tenant/07-notifications.sql
infrastructure/database/tenant/09-directory-sync.sql
infrastructure/database/tenant/99-access.sql
```

Scripts `00`, `01`, and `02` are the core application. Run only the optional
feature scripts used by the organisation. Run `99-access.sql` last when doing
a manual setup.

For a schema tenant:

```sql
create schema if not exists springfield;
set search_path to springfield, public;
```

For a dedicated tenant, connect directly to its database. In both modes,
register the target in the platform `organisations` table after applying the
tenant scripts.

## Database accounts

After registering all targets, configure the shared web and backup accounts:

```bash
npm run db:configure-access
```

The command creates or updates `myntix_web` and `myntix_backup`, applies
least-privilege access to every active tenant, and updates dedicated tenant
connection records. For a one-time migration from the former per-purpose
accounts, run:

```bash
npm run db:configure-access -- --remove-legacy-roles
```

See `infrastructure/docs/DATABASE_ACCESS.md` for required environment variables and the exact
role model.

## Notes

- Both dedicated databases and shared-database schemas are supported.
- Database credentials never reach the browser.
- The bootstrap scripts are idempotent for initial setup, but they are not a
  production migration system. Use explicit forward migrations after launch.
- The initial local admin from `01-auth.sql` is `admin` / `admin`; change it
  immediately.
