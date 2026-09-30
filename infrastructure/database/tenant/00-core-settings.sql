-- Core school database setup.
--
-- Run this first against the school database.
-- Creates shared settings and operational log tables used by the app.
begin;

create extension if not exists pgcrypto;

create table if not exists school_info (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Demo School',
  address text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  website text not null default '',
  timezone text not null default '',
  currency_name text not null default 'credits',
  balance_cap integer check (balance_cap is null or balance_cap > 0),
  logo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table school_info
  add column if not exists balance_cap integer check (balance_cap is null or balance_cap > 0);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists server_error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  stack text not null default '',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on audit_log(created_at);
create index if not exists audit_log_actor_idx on audit_log(actor_user_id);
create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);
create index if not exists server_error_log_created_at_idx on server_error_log(created_at);
create index if not exists server_error_log_source_idx on server_error_log(source);

insert into school_info (id, name, currency_name)
values (1, 'Demo School', 'credits')
on conflict (id) do update
set name = excluded.name,
    currency_name = excluded.currency_name,
    updated_at = now();

commit;
