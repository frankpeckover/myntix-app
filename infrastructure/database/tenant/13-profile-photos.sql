-- Run for each existing tenant with its schema first in search_path.
begin;
alter table directory_sync_sources add column if not exists sync_profile_photos boolean not null default false;
commit;
