-- Account-level UI and workflow preferences. Run once per tenant database/schema.
begin;

create table if not exists user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_object check (jsonb_typeof(preferences) = 'object')
);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'myntix_tenant_access') then
    execute 'grant select, insert, update, delete on user_preferences to myntix_tenant_access';
  end if;
  if exists (select 1 from pg_roles where rolname = 'myntix_backup_restore_access') then
    execute 'grant all privileges on user_preferences to myntix_backup_restore_access';
  end if;
end $$;

commit;
