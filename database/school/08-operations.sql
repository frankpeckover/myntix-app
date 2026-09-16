-- Operational status framework for school administrators.
--
-- Backup workers record lifecycle events here. Credentials and storage paths
-- must remain in the worker environment, never in this table.
begin;

create extension if not exists pgcrypto;

create table if not exists backup_runs (
  id uuid primary key default gen_random_uuid(),
  backup_type text not null default 'database'
    check (backup_type in ('database', 'full')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  destination_label text not null default '',
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (status = 'running' and completed_at is null)
    or (status in ('succeeded', 'failed') and completed_at is not null)
  )
);

create index if not exists backup_runs_started_at_idx
  on backup_runs(started_at desc);
create index if not exists backup_runs_status_started_idx
  on backup_runs(status, started_at desc);

commit;
