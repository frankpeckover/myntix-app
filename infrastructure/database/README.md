# Database setup

The SQL is split into independent modules and can be run from DBeaver or
`psql`. Create each database before running its module; these files do not
contain connection commands or passwords. Platform and backup catalogues are
separate databases. Tenant scripts run either in a dedicated tenant database
or with the tenant schema selected in a shared database.

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

Run the tenant modules in this order. The numbered files are the current
bootstrap/setup baseline; on existing production tenants, apply new numbered
modules as explicit forward migrations and do not rerun older bootstrap SQL
without reviewing its effects.

```txt
infrastructure/database/tenant/00-core-settings.sql
infrastructure/database/tenant/01-auth.sql
infrastructure/database/tenant/02-ledger.sql
infrastructure/database/tenant/03-groups-timetable.sql
infrastructure/database/tenant/04-rewards.sql
infrastructure/database/tenant/05-sso.sql
infrastructure/database/tenant/06-api-clients.sql
infrastructure/database/tenant/07-notifications.sql
infrastructure/database/tenant/08-user-preferences.sql
infrastructure/database/tenant/09-directory-sync.sql
infrastructure/database/tenant/10-timetable-cycles.sql
infrastructure/database/tenant/11-query-performance.sql
infrastructure/database/tenant/99-access.sql
```

Scripts `00` through `04` establish the core organisation, identity, ledger,
groups/timetable, and rewards features. Apply `05` through `10` for SSO, API
clients, notifications, account preferences, directory sync, timetable
cycles, and query-performance indexes. Run `99-access.sql` last after all
tenant tables exist. Apply new numbered modules to existing production tenants
as forward migrations.

For a schema tenant, set the schema on the same connection before running each
tenant module:

```sql
create schema if not exists springfield;
set search_path to springfield, public;
```

For a dedicated tenant, connect directly to its database. In both modes,
register the target in the platform `organisations` table. The seeded local
platform example is in `platform/00-core.sql`; inspect its domain and database
values and edit them for your environment before using that seed pattern.

## Database accounts

After registering all targets, configure the shared web and backup accounts:

```bash
npm run db:configure-access
```

The command creates or updates `myntix_web` and `myntix_backup`, applies
least-privilege access to registered platform, tenant, and backup catalogue
databases, and updates dedicated tenant connection records. Supply the
administrator and new login passwords as environment variables; see
`infrastructure/docs/DATABASE_ACCESS.md`. For a one-time migration from the
former per-purpose accounts, run:

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
  immediately. Never use this seed password for a public or real organisation.
- `08-user-preferences.sql` creates persisted account preferences and is part
  of the numbered tenant setup above.
- Rerun `99-access.sql` after any newly created tenant table if the web or
  backup roles need grants on it.
- `infrastructure/database/demo/seed-demo-data.sql` is fictional demo data and
  must never be run against a real school tenant.
