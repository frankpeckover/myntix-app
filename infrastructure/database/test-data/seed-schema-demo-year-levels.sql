-- One-off test data only. Leaves one in five students without a year level.
-- Run after 12-student-year-level.sql, with schema_demo first in search_path.
begin;
do $$
begin
  if current_schema() <> 'schema_demo' then
    raise exception 'This test seed may only run in schema_demo';
  end if;
end $$;

with students as (
  select users.id, row_number() over (order by users.username, users.id) as position
  from users join roles on roles.id = users.role_id
  where roles.role_key = 'student'
)
update users
set year_level = case when students.position % 5 = 0 then null
                     else ((students.position - 1) % 13)::smallint end,
    updated_at = now()
from students where users.id = students.id;

-- Predictable accounts for manually testing each layout.
update users set year_level = 4 where username = 'ava.thompson';
update users set year_level = 7 where username = 'felix.edwards';
update users set year_level = null where username = 'ella.baker';
commit;
