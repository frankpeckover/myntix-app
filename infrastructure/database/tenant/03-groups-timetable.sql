-- Groups and timetable setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
begin;

create extension if not exists pgcrypto;

create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references student_groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references users(id) on delete restrict,
  group_id uuid not null references student_groups(id) on delete restrict,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_entries_day_check check (day_of_week between 0 and 6),
  constraint timetable_entries_time_check check (start_time < end_time)
);

create index if not exists student_groups_active_idx on student_groups(is_active);
create index if not exists student_group_memberships_group_idx on student_group_memberships(group_id);
create index if not exists student_group_memberships_user_idx on student_group_memberships(user_id);
create index if not exists timetable_entries_teacher_time_idx
  on timetable_entries(teacher_user_id, day_of_week, start_time, end_time)
  where is_active = true;
create index if not exists timetable_entries_group_idx on timetable_entries(group_id);
create unique index if not exists timetable_entries_active_unique_idx
  on timetable_entries(teacher_user_id, group_id, day_of_week, start_time, end_time)
  where is_active = true;

insert into permissions (key, name, description, category)
values
  ('groups.manage', 'Manage groups', 'Create, archive, and manage student groups.', 'groups'),
  ('timetable.manage', 'Manage timetable', 'Assign teachers to groups by day and time.', 'timetable')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'groups.manage',
  'timetable.manage'
)
where roles.role_key = 'admin'
on conflict do nothing;

commit;
