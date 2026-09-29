-- Run against the platform database as its owner.
begin;

alter table organisations
  add column if not exists maintenance_mode boolean not null default false;

alter table organisations
  add column if not exists maintenance_message text;

commit;
