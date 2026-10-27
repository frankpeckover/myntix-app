-- Run for every existing tenant, with its schema first in search_path.
begin;
alter table users
  add column if not exists year_level smallint
    constraint users_year_level_check check (year_level between 0 and 12);
commit;
