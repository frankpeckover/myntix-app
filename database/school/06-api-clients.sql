-- Optional external API client setup.
--
-- Requires:
--   00-core-settings.sql
--   02-ledger.sql
--   04-rewards.sql
begin;

create extension if not exists pgcrypto;

create table if not exists api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  key_prefix text not null,
  key_hash text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_client_scopes (
  client_id uuid not null references api_clients(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, scope)
);

alter table api_client_scopes
  drop constraint if exists api_client_scopes_scope_check;

insert into api_client_scopes (client_id, scope)
select client_id,
       case scope
         when 'balances:read' then 'accounts:read'
         when 'ledger:hold' then 'holds:write'
       end
from api_client_scopes
where scope in ('balances:read', 'ledger:hold')
on conflict do nothing;

delete from api_client_scopes
where scope in ('balances:read', 'ledger:hold', 'ledger:void');

alter table api_client_scopes
  add constraint api_client_scopes_scope_check check (
    scope in (
      'accounts:read',
      'ledger:read',
      'ledger:credit',
      'ledger:debit',
      'holds:read',
      'holds:write',
      'rewards:read',
      'purchases:read',
      'purchases:write'
    )
  );

alter table api_clients add column if not exists expires_at timestamptz;
alter table api_clients add column if not exists last_used_at timestamptz;
alter table api_clients add column if not exists revoked_at timestamptz;

create table if not exists api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references api_clients(id) on delete cascade,
  idempotency_key text not null,
  request_hash text not null,
  response_body jsonb,
  status_code integer,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  unique (client_id, idempotency_key)
);

create table if not exists api_request_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  client_id uuid references api_clients(id) on delete restrict,
  method text not null,
  path text not null,
  status_code integer not null,
  idempotency_key text,
  duration_ms integer not null,
  created_at timestamptz not null default now()
);

alter table api_idempotency_keys alter column response_body drop not null;
alter table api_idempotency_keys alter column status_code drop not null;
alter table api_idempotency_keys add column if not exists completed_at timestamptz;
alter table api_idempotency_keys
  add column if not exists expires_at timestamptz not null
  default (now() + interval '24 hours');
update api_idempotency_keys
set completed_at = coalesce(completed_at, created_at)
where response_body is not null and completed_at is null;

alter table account_holds
  drop constraint if exists account_holds_api_client_fk;
alter table account_holds
  add constraint account_holds_api_client_fk
  foreign key (created_by_api_client_id)
  references api_clients(id)
  on delete restrict;

alter table shop_purchases
  drop constraint if exists shop_purchases_api_client_fk;
alter table shop_purchases
  add constraint shop_purchases_api_client_fk
  foreign key (requested_by_api_client_id)
  references api_clients(id)
  on delete restrict;

create index if not exists api_clients_active_idx on api_clients(is_active);
create index if not exists api_client_scopes_scope_idx on api_client_scopes(scope);
create index if not exists api_idempotency_keys_client_idx on api_idempotency_keys(client_id);
create index if not exists api_idempotency_keys_expiry_idx on api_idempotency_keys(expires_at);
create index if not exists api_request_log_client_created_idx
  on api_request_log(client_id, created_at desc);
create index if not exists shop_purchases_api_client_idx
  on shop_purchases(requested_by_api_client_id);

commit;
