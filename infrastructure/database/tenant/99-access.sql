-- Tenant grants for the consolidated Myntix database roles.
--
-- Run `npm run db:configure-access` once at platform level to create the roles
-- and configure every registered tenant automatically. This file remains useful
-- when applying a tenant manually in DBeaver.
--
-- Change target_schema for a schema tenant. Keep `public` for a dedicated
-- tenant database. Passwords belong on the two LOGIN roles and are never stored
-- in this file.
begin;

do $$
declare
  target_schema text := 'public';
  web_access_role text := 'myntix_tenant_access';
  backup_owner_role text := 'myntix_backup_restore_access';
  object record;
begin
  if target_schema !~ '^[a-z][a-z0-9_]*$' or target_schema ~ '^pg_' then
    raise exception 'Invalid target_schema: %', target_schema;
  end if;

  if not exists (select 1 from pg_roles where rolname = web_access_role)
     or not exists (select 1 from pg_roles where rolname = backup_owner_role) then
    raise exception 'Run npm run db:configure-access before applying tenant grants.';
  end if;

  execute format('create schema if not exists %I', target_schema);
  execute format('alter schema %I owner to %I', target_schema, backup_owner_role);
  execute format('grant connect on database %I to %I, %I', current_database(), web_access_role, backup_owner_role);
  execute format('grant usage on schema %I to %I', target_schema, web_access_role);
  execute format('grant usage, create on schema %I to %I', target_schema, backup_owner_role);

  for object in
    select c.relkind, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = target_schema
      and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  loop
    execute format(
      'alter %s %I.%I owner to %I',
      case object.relkind
        when 'S' then 'sequence'
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
        else 'table'
      end,
      target_schema,
      object.relname,
      backup_owner_role
    );
  end loop;

  execute format('grant select, insert, update, delete on all tables in schema %I to %I', target_schema, web_access_role);
  execute format('grant usage, select, update on all sequences in schema %I to %I', target_schema, web_access_role);
  execute format('grant all privileges on all tables in schema %I to %I', target_schema, backup_owner_role);
  execute format('grant all privileges on all sequences in schema %I to %I', target_schema, backup_owner_role);
  execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to %I', target_schema, web_access_role);
  execute format('alter default privileges in schema %I grant usage, select, update on sequences to %I', target_schema, web_access_role);
  execute format('alter default privileges for role %I in schema %I grant select, insert, update, delete on tables to %I', backup_owner_role, target_schema, web_access_role);
  execute format('alter default privileges for role %I in schema %I grant usage, select, update on sequences to %I', backup_owner_role, target_schema, web_access_role);
end $$;

commit;
