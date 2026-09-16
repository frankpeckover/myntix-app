-- Rewards module setup.
--
-- Requires:
--   00-core-settings.sql
--   01-auth.sql
--   02-ledger.sql
begin;

create extension if not exists pgcrypto;

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  image_url text not null default '',
  price integer not null,
  quantity integer not null default 0,
  is_quantity_unlimited boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_items_price_not_negative check (price >= 0),
  constraint shop_items_quantity_not_negative check (quantity >= 0)
);

alter table shop_items
  add column if not exists is_quantity_unlimited boolean not null default false;

create table if not exists shop_purchases (
  id uuid primary key default gen_random_uuid(),
  shop_item_id uuid not null references shop_items(id) on delete restrict,
  purchased_by_user_id uuid not null references users(id) on delete restrict,
  price_at_purchase integer not null,
  status text not null default 'pending',
  decided_by_user_id uuid references users(id) on delete restrict,
  decided_at timestamptz,
  decision_note text not null default '',
  stock_reserved boolean not null default true,
  requested_by_api_client_id uuid,
  is_voided boolean not null default false,
  voided_at timestamptz,
  purchased_at timestamptz not null default now(),
  constraint shop_purchases_status_check check (
    status in ('pending', 'approved', 'denied')
  )
);

alter table shop_purchases
  add column if not exists stock_reserved boolean not null default true;
alter table shop_purchases
  add column if not exists requested_by_api_client_id uuid;
alter table account_holds
  add column if not exists related_purchase_id uuid
  references shop_purchases(id) on delete restrict;

create index if not exists shop_items_active_idx on shop_items(is_active);
create index if not exists shop_purchases_user_idx on shop_purchases(purchased_by_user_id);
create index if not exists shop_purchases_status_idx on shop_purchases(status);
create index if not exists shop_purchases_voided_idx on shop_purchases(is_voided);
create unique index if not exists account_holds_purchase_idx
  on account_holds(related_purchase_id)
  where related_purchase_id is not null;

insert into permissions (key, name, description, category)
values
  ('shop.items.manage', 'Manage reward items', 'Create, edit, archive, and restock reward items.', 'rewards'),
  ('shop.items.request', 'Request rewards', 'Request available rewards.', 'rewards'),
  ('shop.requests.approve', 'Approve reward requests', 'Approve or deny pending reward requests.', 'rewards')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in ('shop.items.request')
where roles.role_key = 'student'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in (
  'shop.items.manage',
  'shop.requests.approve'
)
where roles.role_key = 'teacher'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select roles.id, permissions.key
from roles
join permissions on permissions.key in ('shop.items.manage')
where roles.role_key = 'admin'
on conflict do nothing;

commit;
