-- Run against the dedicated Myntix backup catalogue database.
-- Dump files and credentials do not belong in this database.
begin;

create extension if not exists pgcrypto;

create table if not exists tenant_backups (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  organisation_slug text not null,
  organisation_name text not null,
  tenancy_mode text not null check (tenancy_mode in ('schema', 'database')),
  source text not null check (source in ('manual', 'scheduled', 'pre_restore')),
  status text not null default 'creating'
    check (status in ('creating', 'available', 'failed', 'deleted')),
  storage_key text,
  checksum_sha256 text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  check (
    status <> 'available'
    or (
      storage_key is not null
      and checksum_sha256 is not null
      and size_bytes is not null
      and completed_at is not null
    )
  )
);

create table if not exists backup_jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  organisation_slug text not null,
  organisation_name text not null,
  job_type text not null check (job_type in ('backup', 'restore')),
  source text not null check (source in ('manual', 'scheduled')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  phase text not null default 'queued',
  backup_id uuid references tenant_backups(id) on delete restrict,
  requested_by_user_id uuid,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  worker_id text,
  lease_expires_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  check (
    (job_type = 'backup' and backup_id is null)
    or (job_type = 'restore' and backup_id is not null)
  )
);

create unique index if not exists backup_jobs_one_active_per_organisation_idx
  on backup_jobs(organisation_id)
  where status in ('queued', 'running');

create index if not exists backup_jobs_queue_idx
  on backup_jobs(status, requested_at);

create index if not exists backup_jobs_organisation_idx
  on backup_jobs(organisation_id, requested_at desc);

create index if not exists tenant_backups_organisation_idx
  on tenant_backups(organisation_id, created_at desc)
  where status = 'available';

commit;

-- `npm run db:configure-access` applies grants through reusable NOLOGIN
-- permission roles. The web process connects as `myntix_web`; the isolated
-- worker connects as `myntix_backup`.
--
-- Do not grant the web login restore privileges or R2 access.
