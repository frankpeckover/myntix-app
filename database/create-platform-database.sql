-- App platform database setup for DBeaver or any normal SQL editor.
--
-- Before running this file:
--   1. Create the platform database, for example app_platform.
--   2. Connect DBeaver to that platform database as a PostgreSQL admin or owner.
--   3. Change the seeded organisation and platform app user values if needed.
--   4. Run this whole file.
--
-- This creates the platform lookup table and seeds one development organisation.
--
-- First seeded organisation:
--   slug: local
--   domain: dev.app.local
--   tenancy mode: database
--   school database: app_dev
--   school database user: dev_app_user
--
-- The platform_app_user/password values are the one database login the web app
-- needs in .env.local to find all school database connection details.
begin;

create extension if not exists pgcrypto;

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  primary_domain text not null unique,
  tenancy_mode text not null default 'database',
  schema_name text,
  database_host text,
  database_port integer,
  database_name text,
  database_user text,
  database_password text,
  is_active boolean not null default true,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organisations
  add column if not exists tenancy_mode text not null default 'database';

alter table organisations
  add column if not exists schema_name text;

alter table organisations
  add column if not exists maintenance_mode boolean not null default false;

alter table organisations
  add column if not exists maintenance_message text;

alter table organisations
  alter column database_host drop not null,
  alter column database_port drop not null,
  alter column database_name drop not null,
  alter column database_user drop not null,
  alter column database_password drop not null;

alter table organisations
  drop constraint if exists organisations_tenancy_mode_check;

alter table organisations
  add constraint organisations_tenancy_mode_check
  check (tenancy_mode in ('schema', 'database'));

alter table organisations
  drop constraint if exists organisations_tenant_target_check;

alter table organisations
  add constraint organisations_tenant_target_check
  check (
    (
      tenancy_mode = 'schema'
      and schema_name is not null
      and schema_name ~ '^[a-z][a-z0-9_]*$'
      and schema_name !~ '^pg_'
    )
    or
    (
      tenancy_mode = 'database'
      and schema_name is null
      and database_host is not null
      and database_name is not null
      and database_user is not null
      and database_password is not null
    )
  );

create index if not exists organisations_primary_domain_idx
  on organisations(primary_domain);

create table if not exists platform_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  severity text not null default 'warning',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_announcements_message_check
    check (length(trim(message)) between 1 and 1000),
  constraint platform_announcements_severity_check
    check (severity in ('info', 'warning', 'critical')),
  constraint platform_announcements_time_range_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists platform_announcements_active_idx
  on platform_announcements(is_active, starts_at desc);

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
  'local',
  'Development School',
  'dev.app.local',
  'database',
  null,
  'localhost',
  5432,
  'app_dev',
  'dev_app_user',
  'gB6eYM688eR'
)
on conflict (slug) do update
set name = excluded.name,
    primary_domain = excluded.primary_domain,
    tenancy_mode = excluded.tenancy_mode,
    schema_name = excluded.schema_name,
    database_host = excluded.database_host,
    database_port = excluded.database_port,
    database_name = excluded.database_name,
    database_user = excluded.database_user,
    database_password = excluded.database_password,
    is_active = true,
    updated_at = now();

do $$
declare
  platform_app_user text := 'platform_app_user';
  platform_app_password text := 'pg^ma@i45AB20G%';
begin
  if exists (
    select 1
    from pg_roles
    where rolname = platform_app_user
  ) then
    execute format(
      'alter role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      platform_app_user,
      platform_app_password
    );
  else
    execute format(
      'create role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls',
      platform_app_user,
      platform_app_password
    );
  end if;

  execute format('grant connect on database %I to %I', current_database(), platform_app_user);
  execute format('grant usage on schema public to %I', platform_app_user);
  execute format('grant select, insert, update, delete on all tables in schema public to %I', platform_app_user);
  execute format('grant usage, select, update on all sequences in schema public to %I', platform_app_user);
  execute format('alter default privileges in schema public grant select, insert, update, delete on tables to %I', platform_app_user);
  execute format('alter default privileges in schema public grant usage, select, update on sequences to %I', platform_app_user);
end $$;

commit;

