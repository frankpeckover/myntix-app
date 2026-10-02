-- Adds optional rotating timetable weeks to an existing tenant.
-- Null cycle_week values continue to apply every week.
begin;

alter table school_info
  add column if not exists timetable_cycle_length integer not null default 1,
  add column if not exists timetable_cycle_start_date date;

alter table timetable_entries
  add column if not exists cycle_week integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'school_info_timetable_cycle_length_check'
  ) then
    alter table school_info add constraint school_info_timetable_cycle_length_check
      check (timetable_cycle_length between 1 and 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'timetable_entries_cycle_week_check'
  ) then
    alter table timetable_entries add constraint timetable_entries_cycle_week_check
      check (cycle_week between 1 and 6);
  end if;
end $$;

drop index if exists timetable_entries_active_unique_idx;
create unique index timetable_entries_active_unique_idx
  on timetable_entries(
    teacher_user_id,
    group_id,
    day_of_week,
    start_time,
    end_time,
    coalesce(cycle_week, 0)
  )
  where is_active = true;

commit;
