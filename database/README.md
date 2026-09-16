# App Database Setup

This folder contains DBeaver-friendly PostgreSQL setup scripts.

The platform database is still a single setup file:

- `create-platform-database.sql`

Each school/app schema is split by service area under:

- `school/00-core-settings.sql`
- `school/01-auth.sql`
- `school/02-ledger.sql`
- `school/03-groups-timetable.sql`
- `school/04-rewards.sql`
- `school/05-sso.sql`
- `school/06-api-clients.sql`
- `school/07-notifications.sql`
- `school/08-operations.sql`
- `school/99-grants.sql`

All files are plain SQL. They do not use `psql` backslash commands, so they can be run from DBeaver.

Normal SQL cannot create a database and then switch into it inside the same script. Create the empty database first, connect to that database, then run the relevant setup files.

The app supports two tenant modes:

- `database`: one isolated database per organisation.
- `schema`: one shared app database with one schema per organisation.

## Setup Order

1. Create and set up the platform database once.
2. Choose the tenant mode for the organisation.
3. For `database` mode, create one database for the school and connect to it.
4. For `schema` mode, create one schema inside the shared app database and set the SQL editor search path to that schema.
5. Run the required core school setup scripts.
6. Run only the optional feature scripts that organisation needs.
7. Run `school/99-grants.sql` last.
8. Put the platform database connection in the app `.env.local`.
9. Put each organisation target in the platform database `organisations` table.

## Platform Database

The platform database stores the lookup records that tell the app which tenant target to use for each domain/subdomain.

Run:

```txt
database/create-platform-database.sql
```

In DBeaver:

1. Create a database, for example `app_platform`.
2. Connect to `app_platform` as a PostgreSQL admin or database owner.
3. Open `create-platform-database.sql`.
4. Change the seeded organisation values if needed.
5. Run the whole file.

The script creates:

- `organisations`
- one seeded development organisation
- the platform app PostgreSQL login
- grants for that login

The app expects these environment variables for the platform database:

```txt
PLATFORM_POSTGRES_HOST=
PLATFORM_POSTGRES_PORT=5432
PLATFORM_POSTGRES_DATABASE=app_platform
PLATFORM_POSTGRES_USER=platform_app_user
PLATFORM_POSTGRES_PASSWORD=
APP_ROOT_DOMAIN=app.example.com
LOCAL_ORGANISATION_SLUG=local
```

For schema-mode organisations, the app also expects a shared app database connection:

```txt
APP_POSTGRES_HOST=
APP_POSTGRES_PORT=5432
APP_POSTGRES_DATABASE=myntix_app
APP_POSTGRES_USER=shared_app_user
APP_POSTGRES_PASSWORD=
```

For database-mode organisations, credentials are still stored in the matching `organisations` row.

## School Tenant Setup

Each organisation can either use an isolated database or a schema in the shared app database.

Minimum app setup:

```txt
database/school/00-core-settings.sql
database/school/01-auth.sql
database/school/02-ledger.sql
database/school/99-grants.sql
```

Optional modules:

```txt
database/school/03-groups-timetable.sql
database/school/04-rewards.sql
database/school/05-sso.sql
database/school/06-api-clients.sql
database/school/07-notifications.sql
database/school/08-operations.sql
```

Current full app setup:

```txt
database/school/00-core-settings.sql
database/school/01-auth.sql
database/school/02-ledger.sql
database/school/03-groups-timetable.sql
database/school/04-rewards.sql
database/school/05-sso.sql
database/school/06-api-clients.sql
database/school/07-notifications.sql
database/school/08-operations.sql
database/school/99-grants.sql
```

### Database Mode

In DBeaver:

1. Create a database, for example `app_dev`.
2. Connect to `app_dev` as a PostgreSQL admin or database owner.
3. Open each required school script.
4. Run them in numbered order.
5. Change `school_app_user` and `school_app_password` in `99-grants.sql` if needed.
6. Leave `target_schema` in `99-grants.sql` as `public`.
7. Run `99-grants.sql` last.

Example platform row:

```sql
insert into organisations (
  slug,
  name,
  primary_domain,
  tenancy_mode,
  schema_name,
  database_host,
  database_port,
  database_name,
  database_user,
  database_password
)
values (
  'springfield',
  'Springfield School',
  'springfield.myntix.com',
  'database',
  null,
  'postgres.example.com',
  5432,
  'springfield_app',
  'springfield_app_user',
  'change_me'
);
```

### Schema Mode

In DBeaver:

1. Create or connect to the shared app database, for example `myntix_app`.
2. Create the organisation schema:

```sql
create schema if not exists springfield;
set search_path to springfield, public;
```

3. Run each required school setup script in the same SQL editor/connection after the `set search_path`.
4. In `99-grants.sql`, change:

```sql
target_schema text := 'springfield';
```

5. Run `99-grants.sql` last.

Example platform row:

```sql
insert into organisations (
  slug,
  name,
  primary_domain,
  tenancy_mode,
  schema_name,
  database_host,
  database_port,
  database_name,
  database_user,
  database_password
)
values (
  'springfield',
  'Springfield School',
  'springfield.myntix.com',
  'schema',
  'springfield',
  null,
  null,
  null,
  null,
  null
);
```

Initial admin login from `01-auth.sql`:

```txt
username: admin
password: admin
```

Default school database/schema login created by `99-grants.sql`:

```txt
username: dev_app_user
password: gB6eYM688eR
```

The seeded `local` organisation in `create-platform-database.sql` points to this default login in database mode. If you change the school database login, update the matching `organisations` row in the platform database as well.

Use a different database login per school when you move beyond local development, for example:

```txt
school_app_user_dev
school_app_user_springfield
school_app_user_riverside
```

Then add that username and password to the matching `organisations` row in the platform database for database-mode tenants. For schema-mode tenants, put the shared app database login in `.env.local`.

## Feature Notes

The current app still expects the enabled UI features to have their matching database tables.

For example:

- If rewards are visible in the app, run `04-rewards.sql`.
- If groups or timetables are visible in the app, run `03-groups-timetable.sql`.
- If SSO is enabled, run `05-sso.sql`.
- If external API clients are enabled, run `06-api-clients.sql`.
- If in-app notifications or email digests are enabled, run `07-notifications.sql`.
- Run `08-operations.sql` to enable backup and operational status reporting.

## Useful Checks

Platform database:

```sql
select slug, name, primary_domain, tenancy_mode, schema_name, database_name, database_user, is_active
from organisations
order by slug;
```

School database:

```sql
select name, address, currency_name, logo_url
from school_info;

select
  users.username,
  users.first_name,
  users.last_name,
  roles.role_key,
  users.is_active
from users
join roles on roles.id = users.role_id
order by users.username;

select name, price, quantity, is_active
from shop_items
order by name;
```

## API Clients

External apps use API keys stored in the school database as hashed values. Generate a key and insert SQL from the app folder:

```txt
npm run create-api-client -- --name "Rewards app" --scopes accounts:read,ledger:read,holds:read,holds:write,rewards:read,purchases:read,purchases:write
```

The command prints the raw key once, then prints SQL you can run against the school database in DBeaver. Store the raw key in the external app, not in this app.

Available scopes:

```txt
accounts:read
ledger:read
ledger:credit
ledger:debit
holds:read
holds:write
rewards:read
purchases:read
purchases:write
```

API routes are tenant-scoped by hostname and start at `/api/v1`:

```txt
GET  /students/resolve?email={email}
GET  /accounts/{accountId}
GET  /accounts/{accountId}/balance
GET  /accounts/{accountId}/ledger?limit=50&before={ISO date}
POST /accounts/{accountId}/credits
POST /accounts/{accountId}/debits
POST /accounts/{accountId}/holds
GET  /holds/{holdId}
POST /holds/{holdId}/capture
POST /holds/{holdId}/release
POST /ledger/entries/{entryId}/reverse
GET  /rewards
POST /purchases
GET  /purchases/{purchaseId}
POST /purchases/{purchaseId}/approve
POST /purchases/{purchaseId}/deny
```

Pass the raw key as `Authorization: Bearer {key}`. Every `POST` also requires
a unique `Idempotency-Key` header. Money mutations accept positive whole-number
amounts in JSON; the route determines whether the amount is a credit or debit.
Purchase creation accepts `accountId` and `rewardId`. Ledger reversals append
a compensating entry and never edit or delete the original entry.

## Notes

- The browser never receives database credentials.
- The app only needs the platform database credentials in `.env.local`.
- School database credentials live in the platform database.
- The setup scripts can be rerun during development, but they are not a migration system. Once real schools are using the app, schema changes should become explicit migrations.
