-- Ledger, balances, goals, and credit adjustment setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
begin;

create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete restrict,
  account_name text not null default 'Primary account',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount integer not null,
  entry_type text not null,
  status text not null,
  description text not null,
  related_entity_type text,
  related_entity_id uuid,
  created_by_user_id uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  is_voided boolean not null default false,
  voided_by_user_id uuid references users(id) on delete restrict,
  voided_at timestamptz,
  void_reason text not null default '',
  reversal_of_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  constraint ledger_entries_amount_not_zero check (amount <> 0),
  constraint ledger_entries_type_check check (
    entry_type in (
      'reward',
      'penalty',
      'credit',
      'debit',
      'hold',
      'shop_hold',
      'shop_purchase',
      'shop_refund',
      'manual_adjustment',
      'void_reversal'
    )
  ),
  constraint ledger_entries_status_check check (
    status in ('pending', 'posted', 'voided')
  )
);

create table if not exists account_holds (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  amount integer not null,
  description text not null,
  status text not null default 'active',
  expires_at timestamptz,
  created_by_api_client_id uuid,
  captured_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_holds_amount_positive check (amount > 0),
  constraint account_holds_status_check check (
    status in ('active', 'captured', 'released')
  )
);

create index if not exists account_holds_account_active_idx
  on account_holds(account_id, status);
create index if not exists account_holds_expiry_idx
  on account_holds(expires_at)
  where status = 'active';

create table if not exists ledger_entry_receipts (
  ledger_entry_id uuid not null references ledger_entries(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (ledger_entry_id, user_id)
);

create table if not exists student_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  title text not null default 'Savings goal',
  target_amount integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_goals_target_positive check (target_amount > 0)
);

create table if not exists transaction_presets (
  id uuid primary key default gen_random_uuid(),
  preset_type text not null,
  amount integer,
  reason text,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (preset_type, sort_order),
  constraint transaction_presets_type_check check (
    preset_type in ('amount', 'reason')
  ),
  constraint transaction_presets_amount_check check (
    preset_type <> 'amount' or (amount is not null and amount > 0)
  ),
  constraint transaction_presets_reason_check check (
    preset_type <> 'reason' or (reason is not null and length(trim(reason)) > 0)
  )
);

create table if not exists user_transaction_preset_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  amounts integer[] not null default '{}',
  reasons text[] not null default '{}',
  quick_add_amount integer,
  quick_add_reason text,
  quick_remove_amount integer,
  quick_remove_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_presets_quick_add_amount_positive check (
    quick_add_amount is null or quick_add_amount > 0
  ),
  constraint user_presets_quick_remove_amount_positive check (
    quick_remove_amount is null or quick_remove_amount > 0
  )
);

alter table user_transaction_preset_preferences
  add column if not exists quick_add_amount integer,
  add column if not exists quick_add_reason text,
  add column if not exists quick_remove_amount integer,
  add column if not exists quick_remove_reason text;

create index if not exists accounts_user_idx on accounts(user_id);
create index if not exists ledger_entries_account_idx on ledger_entries(account_id);
create index if not exists ledger_entries_created_at_idx on ledger_entries(created_at);
create index if not exists ledger_entries_status_idx on ledger_entries(status);
create index if not exists ledger_entries_type_idx on ledger_entries(entry_type);
create index if not exists ledger_entries_related_entity_idx
  on ledger_entries(related_entity_type, related_entity_id);
create index if not exists ledger_entry_receipts_user_idx
  on ledger_entry_receipts(user_id, seen_at);
create unique index if not exists ledger_entries_source_unique_idx
  on ledger_entries(related_entity_type, related_entity_id, entry_type)
  where reversal_of_ledger_entry_id is null
    and related_entity_type = 'shop_purchase';
create index if not exists student_goals_user_idx on student_goals(user_id);
create index if not exists transaction_presets_type_idx on transaction_presets(preset_type, sort_order);

insert into permissions (key, name, description, category)
values
  ('balances.view_own', 'View own balance', 'View personal account balance.', 'balances'),
  ('balances.view_all', 'View all balances', 'View student balances across the school.', 'balances'),
  ('transactions.view_own', 'View own transactions', 'View personal transaction history.', 'transactions'),
  ('transactions.view_all', 'View all transactions', 'View transaction history across the school.', 'transactions'),
  ('transactions.create_adjustment', 'Create adjustments', 'Add or remove currency for students and groups.', 'transactions'),
  ('transactions.void', 'Void transactions', 'Void and reverse ledger transactions.', 'transactions')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'balances.view_own',
  'transactions.view_own'
)
where roles.role_key = 'student'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'balances.view_all',
  'transactions.create_adjustment',
  'transactions.view_all'
)
where roles.role_key = 'teacher'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'balances.view_all',
  'transactions.view_all',
  'transactions.void'
)
where roles.role_key = 'admin'
on conflict do nothing;

insert into transaction_presets (preset_type, amount, reason, sort_order)
values
  ('amount', 1, null, 1),
  ('amount', 5, null, 2),
  ('amount', 10, null, 3),
  ('amount', 25, null, 4),
  ('amount', 50, null, 5),
  ('reason', null, 'Great effort', 1),
  ('reason', null, 'Helping others', 2),
  ('reason', null, 'Homework complete', 3),
  ('reason', null, 'Positive participation', 4),
  ('reason', null, 'Late work', 5),
  ('reason', null, 'Class disruption', 6)
on conflict (preset_type, sort_order) do nothing;

commit;
