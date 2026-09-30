-- External directory and timetable synchronization setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
--   03-groups-timetable.sql
begin;

create extension if not exists pgcrypto;

create table if not exists directory_sync_sources (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null unique,
  display_name text not null,
  base_url text not null default '',
  company_code text not null default '',
  application_code text not null default '',
  token_key_encrypted text not null default '',
  api_version integer not null default 3,
  academic_year integer not null default extract(year from current_date)::integer,
  semester integer not null default 1,
  is_enabled boolean not null default false,
  archive_missing_records boolean not null default true,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_sync_status text,
  last_sync_summary jsonb not null default '{}'::jsonb,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_sync_sources_provider_check check (provider_type in ('tass')),
  constraint directory_sync_sources_api_version_check check (api_version in (2, 3)),
  constraint directory_sync_sources_semester_check check (semester between 1 and 4),
  constraint directory_sync_sources_year_check check (academic_year between 2000 and 2200),
  constraint directory_sync_sources_status_check check (
    last_sync_status is null or last_sync_status in ('running', 'succeeded', 'failed')
  )
);

create table if not exists directory_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references directory_sync_sources(id) on delete cascade,
  started_by_user_id uuid references users(id) on delete set null,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint directory_sync_runs_status_check check (
    status in ('running', 'succeeded', 'failed')
  )
);

create table if not exists directory_sync_user_mappings (
  source_id uuid not null references directory_sync_sources(id) on delete cascade,
  external_id text not null,
  user_id uuid not null references users(id) on delete cascade,
  external_role text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, external_id),
  unique (source_id, user_id),
  constraint directory_sync_user_role_check check (external_role in ('student', 'teacher'))
);

create table if not exists directory_sync_group_mappings (
  source_id uuid not null references directory_sync_sources(id) on delete cascade,
  external_id text not null,
  group_id uuid not null references student_groups(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, external_id),
  unique (source_id, group_id)
);

create table if not exists directory_sync_timetable_mappings (
  source_id uuid not null references directory_sync_sources(id) on delete cascade,
  external_id text not null,
  timetable_entry_id uuid not null references timetable_entries(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, external_id),
  unique (source_id, timetable_entry_id)
);

create index if not exists directory_sync_runs_source_started_idx
  on directory_sync_runs(source_id, started_at desc);
create index if not exists directory_sync_user_mappings_user_idx
  on directory_sync_user_mappings(user_id);
create index if not exists directory_sync_group_mappings_group_idx
  on directory_sync_group_mappings(group_id);
create index if not exists directory_sync_timetable_mappings_entry_idx
  on directory_sync_timetable_mappings(timetable_entry_id);

insert into directory_sync_sources (provider_type, display_name)
values ('tass', 'TASS')
on conflict (provider_type) do nothing;

commit;
