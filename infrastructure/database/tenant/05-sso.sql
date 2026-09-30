-- Optional SSO setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
begin;

create extension if not exists pgcrypto;

create table if not exists sso_identity_providers (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null unique,
  display_name text not null,
  tenant_id text not null default '',
  client_id text not null default '',
  client_secret_encrypted text not null default '',
  issuer_url text not null default '',
  allowed_domain text not null default '',
  is_enabled boolean not null default false,
  is_jit_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sso_identity_providers_type_check check (
    provider_type in ('google', 'microsoft_entra')
  )
);

alter table sso_identity_providers
  add column if not exists is_jit_enabled boolean not null default false;

create table if not exists sso_user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider_type text not null,
  provider_subject text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  unique (provider_type, provider_subject),
  unique (user_id, provider_type),
  constraint sso_user_identities_type_check check (
    provider_type in ('google', 'microsoft_entra')
  )
);

create index if not exists sso_identity_providers_enabled_idx on sso_identity_providers(is_enabled);
create index if not exists sso_user_identities_user_idx on sso_user_identities(user_id);

insert into sso_identity_providers (
  provider_type,
  display_name,
  issuer_url,
  is_enabled
)
values
  ('google', 'Google', 'https://accounts.google.com', false),
  ('microsoft_entra', 'Microsoft', 'https://login.microsoftonline.com', false)
on conflict (provider_type) do nothing;

commit;
