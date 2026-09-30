-- In-app notifications and email digest setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
--   04-rewards.sql
begin;

create extension if not exists pgcrypto;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  action_target text not null default '',
  entity_type text not null default '',
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_format check (type ~ '^[a-z0-9_.-]+$'),
  constraint notifications_action_target_check check (
    action_target in ('', 'Dashboard', 'Rewards', 'Transaction Log')
  )
);

create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  email_digest_enabled boolean not null default true,
  reward_request_notification_mode text not null default 'off',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_reward_request_mode_check check (
    reward_request_notification_mode in ('off', 'in_app', 'in_app_digest')
  )
);

alter table notification_preferences
  add column if not exists reward_request_notification_mode text not null default 'off';

alter table notification_preferences
  drop constraint if exists notification_preferences_reward_request_mode_check;
alter table notification_preferences
  add constraint notification_preferences_reward_request_mode_check check (
    reward_request_notification_mode in ('off', 'in_app', 'in_app_digest')
  );

create table if not exists notification_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  digest_date date not null,
  pending_approval_count integer not null default 0,
  sent_at timestamptz not null default now(),
  constraint notification_digest_counts_not_negative check (
    pending_approval_count >= 0
  ),
  unique (user_id, digest_date)
);

create unique index if not exists notifications_recipient_dedupe_idx
  on notifications(recipient_user_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists notifications_recipient_created_idx
  on notifications(recipient_user_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on notifications(recipient_user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_expiry_idx
  on notifications(expires_at)
  where expires_at is not null;
create index if not exists notification_digest_date_idx
  on notification_digest_deliveries(digest_date);

commit;
