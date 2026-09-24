-- Auth and user management setup.
--
-- Requires:
--   00-core-settings.sql
--
-- Initial login:
--   username: admin
--   password: admin
begin;

create extension if not exists pgcrypto;

create table if not exists permissions (
  key text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_role_key_format check (role_key ~ '^[a-z0-9_]+$')
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete restrict,
  username text not null unique,
  first_name text not null,
  preferred_name text not null default '',
  last_name text not null,
  email text not null default '',
  profile_image_url text not null default '',
  card_number text not null default '',
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users
  add column if not exists preferred_name text not null default '';

alter table users
  alter column email set default '';

alter table users
  drop constraint if exists users_email_key;

create unique index if not exists users_email_unique_idx
  on users (lower(email))
  where trim(email) <> '';

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists admin_setup_checklist_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  completed_step_keys text[] not null default '{}',
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table audit_log
  drop constraint if exists audit_log_actor_user_id_fkey;

alter table audit_log
  add constraint audit_log_actor_user_id_fkey
  foreign key (actor_user_id) references users(id) on delete set null;

create index if not exists users_role_id_idx on users(role_id);
create index if not exists users_active_role_name_idx
  on users(role_id, is_active, last_name, first_name);
create index if not exists roles_active_idx on roles(is_active);
create index if not exists permissions_category_idx on permissions(category);
create index if not exists role_permissions_permission_idx on role_permissions(permission_key);
create index if not exists password_reset_tokens_user_idx on password_reset_tokens(user_id);
create index if not exists password_reset_tokens_expires_idx on password_reset_tokens(expires_at);
create index if not exists user_sessions_user_idx on user_sessions(user_id);
create index if not exists user_sessions_expires_idx on user_sessions(expires_at);
create index if not exists user_sessions_last_seen_idx on user_sessions(last_seen_at);

insert into roles (role_key, name, description, is_system)
values
  ('student', 'Student', 'Default student role.', true),
  ('teacher', 'Staff', 'Default staff role for teachers and school staff.', true),
  ('admin', 'Admin', 'Default administrator role.', true)
on conflict (role_key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = excluded.is_system,
    updated_at = now();

insert into permissions (key, name, description, category)
values
  ('users.manage', 'Manage users', 'Create, edit, disable, and import users.', 'users'),
  ('passwords.reset_users', 'Reset user passwords', 'Reset passwords for other users.', 'users'),
  ('school_settings.manage', 'Manage school settings', 'Update organisation profile and app settings.', 'settings'),
  ('audit.view', 'View audit log', 'View recent administrative and system changes.', 'audit'),
  ('password.change_own', 'Change own password', 'Change personal account password.', 'account')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in ('password.change_own')
where roles.role_key = 'student'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in ('password.change_own')
where roles.role_key = 'teacher'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'audit.view',
  'password.change_own',
  'passwords.reset_users',
  'school_settings.manage',
  'users.manage'
)
where roles.role_key = 'admin'
on conflict do nothing;

insert into users (
  role_id,
  username,
  first_name,
  last_name,
  email,
  password_hash
)
values (
  (select id from roles where role_key = 'admin'),
  'admin',
  'Admin',
  'User',
  'admin@demo.school',
  'scrypt:v1:6d6572697462616e6b2d61646d696e:21932a14193b7515acb1ed5aa028cbdf9ca413fec34f8ac30b41403d38506e1f4f8989f3dbfdbe00f7216153e448f3e91b2ea9c0b8af0862c80d91a232c54cb2'
)
on conflict (username) do nothing;

commit;
