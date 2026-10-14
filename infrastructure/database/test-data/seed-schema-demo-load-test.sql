-- Additive scale/load dataset for the schema_demo tenant only.
-- This is synthetic test data, not presentation/demo content.
-- Adds 1,500 students, 500 staff, 360 groups, 2,100 timetable entries,
-- 75,000 credit adjustments, and 6,000 reward requests with matching ledger rows.
-- Safe to re-run: generated records have stable loadtest identifiers and conflicts
-- are ignored. This script does not delete or modify existing tenant records.

begin;
set local search_path to schema_demo, public;

do $$
begin
  if current_schema() <> 'schema_demo' then
    raise exception 'Refusing to seed tenant schema: expected schema_demo, got %', current_schema();
  end if;

  if to_regclass('users') is null
     or to_regclass('accounts') is null
     or to_regclass('ledger_entries') is null then
    raise exception 'schema_demo does not contain the required tenant tables';
  end if;
end
$$;

-- Synthetic identities include repeated names, preferred names, and archived
-- accounts so search, filtering, history retention, and account-state flows can
-- be exercised against a school-sized dataset. Emails cannot receive mail.
with first_names as (
  select array[
    'Alex', 'Amelia', 'Ari', 'Ava', 'Ben', 'Charlie', 'Chloe', 'Ethan',
    'Evie', 'Harper', 'Isla', 'Jack', 'Jai', 'Leo', 'Liam', 'Mia', 'Noah',
    'Oliver', 'Ruby', 'Sophie'
  ]::text[] as name_options
),
last_names as (
  select array[
    'Anderson', 'Bennett', 'Brown', 'Campbell', 'Chen', 'Clark', 'Davis',
    'Edwards', 'Evans', 'Hall', 'Harris', 'Jones', 'Kim', 'Lee', 'Martin',
    'Nguyen', 'O''Connor', 'Patel', 'Robinson', 'Smith', 'Taylor', 'Wilson',
    'Wong', 'Young'
  ]::text[] as name_options
),
loadtest_users as (
  select
    'student'::text as role_key,
    n,
    'loadtest.student.' || lpad(n::text, 4, '0') as username,
    first_names.name_options[((n * 7 - 1) % cardinality(first_names.name_options)) + 1] as first_name,
    last_names.name_options[((n * 11 - 1) % cardinality(last_names.name_options)) + 1] as last_name,
    n % 9 = 0 as has_preferred_name,
    n % 47 <> 0 as is_active,
    n % 1250 as age_days
  from generate_series(1, 1500) as series(n)
  cross join first_names
  cross join last_names
  union all
  select
    'teacher',
    n,
    'loadtest.staff.' || lpad(n::text, 4, '0'),
    first_names.name_options[((n * 13 - 1) % cardinality(first_names.name_options)) + 1],
    last_names.name_options[((n * 17 - 1) % cardinality(last_names.name_options)) + 1],
    false,
    n % 97 <> 0,
    n % 1800
  from generate_series(1, 500) as series(n)
  cross join first_names
  cross join last_names
)
insert into users (
  role_id,
  username,
  first_name,
  preferred_name,
  last_name,
  email,
  password_hash,
  is_active,
  created_at,
  updated_at
)
select
  roles.id,
  loadtest_users.username,
  loadtest_users.first_name,
  case when loadtest_users.has_preferred_name
       then case when loadtest_users.first_name = 'Alex' then 'Lexi' else 'Sam' end
       else '' end,
  loadtest_users.last_name,
  loadtest_users.username || '@schema-demo.invalid',
  'scrypt:v1:5c5afed234c33230c91b461a1d398095:34421eb75343354b22a62c6dd7f127710933bb6c73cfb305c4be54922187c09971e9604c97e5b9b3ce540d0a75dd93b6739d7cd2a6fccf18a51f3e20f3118e91',
  loadtest_users.is_active,
  now() - loadtest_users.age_days * interval '1 day',
  now() - loadtest_users.age_days * interval '1 day'
from loadtest_users
join roles on roles.role_key = loadtest_users.role_key
on conflict (username) do nothing;

insert into accounts (user_id, account_name, is_active, created_at, updated_at)
select users.id, 'Primary account', users.is_active, users.created_at, users.updated_at
from users
where users.username like 'loadtest.student.%'
on conflict (user_id) do nothing;

-- 60 tutor groups: ten groups for each year from 7 to 12, with 25 students each.
insert into student_groups (name, description)
select
  'LOADTEST | Year ' || (7 + ((n - 1) / 10))::text || ' Home ' || lpad((((n - 1) % 10) + 1)::text, 2, '0'),
  'Synthetic tutor group for scale, filtering, membership, and timetable testing.'
from generate_series(1, 60) as series(n)
on conflict (name) do nothing;

-- 300 subject groups: five subjects with ten sections for each of six year levels.
with subjects as (
  select * from (values
    (1, 'English'), (2, 'Mathematics'), (3, 'Science'),
    (4, 'Humanities'), (5, 'Health and PE')
  ) as subject(subject_no, subject_name)
),
sections as (
  select year_no, subject_no, subject_name, section_no
  from generate_series(7, 12) as years(year_no)
  cross join subjects
  cross join generate_series(1, 10) as sections(section_no)
)
insert into student_groups (name, description)
select
  'LOADTEST | Year ' || year_no::text || ' ' || subject_name || ' ' || lpad(section_no::text, 2, '0'),
  'Synthetic subject class for scale, filtering, membership, and timetable testing.'
from sections
on conflict (name) do nothing;

-- Place each student in one tutor group and five subject groups.
with test_students as (
  select
    users.id as user_id,
    users.username,
    substring(users.username from '([0-9]{4})$')::integer as student_no
  from users
  where users.username like 'loadtest.student.%'
),
home_memberships as (
  select
    test_students.user_id,
    'LOADTEST | Year ' || (7 + ((student_no - 1) / 250))::text ||
      ' Home ' || lpad(((((student_no - 1) % 250) / 25) + 1)::text, 2, '0') as group_name
  from test_students
),
subject_memberships as (
  select
    test_students.user_id,
    'LOADTEST | Year ' || (7 + ((student_no - 1) / 250))::text || ' ' || subject_name || ' ' ||
      lpad(((((student_no - 1) % 250) / 25) + 1)::text, 2, '0') as group_name
  from test_students
  cross join (values
    ('English'), ('Mathematics'), ('Science'), ('Humanities'), ('Health and PE')
  ) as subjects(subject_name)
)
insert into student_group_memberships (group_id, user_id)
select student_groups.id, memberships.user_id
from (
  select * from home_memberships
  union all
  select * from subject_memberships
) as memberships
join student_groups on student_groups.name = memberships.group_name
on conflict (group_id, user_id) do nothing;

-- Tutor periods run each weekday. Each tutor group has a distinct teacher.
with days as (
  select generate_series(1, 5) as day_of_week
),
home_groups as (
  select
    student_groups.id as group_id,
    row_number() over (order by student_groups.name)::integer as group_no
  from student_groups
  where student_groups.name like 'LOADTEST | Year % Home %'
)
insert into timetable_entries (
  teacher_user_id, group_id, day_of_week, start_time, end_time, cycle_week
)
select
  staff.id,
  home_groups.group_id,
  days.day_of_week,
  time '08:35',
  time '08:50',
  null
from home_groups
cross join days
join users as staff
  on staff.username = 'loadtest.staff.' || lpad((300 + home_groups.group_no)::text, 4, '0')
on conflict do nothing;

-- Subject timetable: three periods per week across a two-week A/B cycle.
with subjects as (
  select * from (values
    (1, 'English'), (2, 'Mathematics'), (3, 'Science'),
    (4, 'Humanities'), (5, 'Health and PE')
  ) as subject(subject_no, subject_name)
),
subject_groups as (
  select
    student_groups.id as group_id,
    student_groups.name,
    row_number() over (order by student_groups.name)::integer as group_no,
    split_part(student_groups.name, ' ', 4)::integer as year_no,
    subjects.subject_no
  from student_groups
  join subjects on student_groups.name like '% ' || subjects.subject_name || ' %'
  where student_groups.name like 'LOADTEST | Year %'
    and student_groups.name not like '% Home %'
),
periods as (
  select * from (values
    (1, 1, time '09:00', time '09:55'),
    (2, 3, time '11:10', time '12:05'),
    (3, 5, time '13:15', time '14:10')
  ) as period(period_no, day_of_week, start_time, end_time)
),
weeks as (
  select generate_series(1, 2) as cycle_week
)
insert into timetable_entries (
  teacher_user_id, group_id, day_of_week, start_time, end_time, cycle_week
)
select
  staff.id,
  subject_groups.group_id,
  ((periods.day_of_week + subject_groups.subject_no - 2) % 5) + 1,
  periods.start_time,
  periods.end_time,
  weeks.cycle_week
from subject_groups
cross join periods
cross join weeks
join users as staff
  on staff.username = 'loadtest.staff.' || lpad(subject_groups.group_no::text, 4, '0')
on conflict do nothing;

-- 15 unlimited-quantity items keep stock from becoming a test bottleneck.
with item_catalog as (
  select
    row_number() over (order by item.item_name)::integer as item_no,
    item.item_name,
    item.base_price
  from (values
    ('Stationery pack', 30), ('Library pass', 45), ('Lunch voucher', 80),
    ('Homework extension', 120), ('Computer time', 150), ('Sports equipment', 175),
    ('Art supplies', 90), ('Music room pass', 110), ('Canteen voucher', 100),
    ('Board game session', 130), ('Front-of-line pass', 75), ('Book choice', 140),
    ('Free-dress day', 200), ('Class helper', 60), ('School merch', 250)
  ) as item(item_name, base_price)
)
insert into shop_items (
  id, name, description, price, quantity, is_quantity_unlimited, is_active
)
select
  md5('loadtest.shop-item.' || n::text)::uuid,
  'LOADTEST | ' || item_catalog.item_name,
  'Synthetic reward item for list, filter, and purchase workflow testing.',
  item_catalog.base_price + ((n * 7) % 15),
  0,
  true,
  true
from generate_series(1, 15) as series(n)
join item_catalog on item_catalog.item_no = n
on conflict (id) do nothing;

-- 50 posted adjustments per test student (75,000 ledger entries), spread over
-- two years. The distribution includes positive rewards and smaller penalties.
with test_students as (
  select
    users.id as user_id,
    substring(users.username from '([0-9]{4})$')::integer as student_no
  from users
  where users.username like 'loadtest.student.%'
),
staff as (
  select
    users.id as user_id,
    substring(users.username from '([0-9]{4})$')::integer as staff_no
  from users
  where users.username like 'loadtest.staff.%'
),
activity_reasons as (
  select array[
    'Positive participation', 'Helping another student', 'Great effort',
    'Homework completed', 'Prepared for class', 'Excellent teamwork',
    'Care for school resources', 'Late to class', 'Missing equipment',
    'Disruptive behaviour', 'Missed homework', 'Uniform reminder'
  ]::text[] as reason_options
),
entries as (
  select
    test_students.user_id,
    test_students.student_no,
    sequence_no,
    ((student_no * 13 + sequence_no * 7) % 730) as age_days,
    ((student_no * 5 + sequence_no * 11) % 480) as minute_offset,
    ((student_no + sequence_no) % 5) < 4 as is_positive,
    ((student_no * 3 + sequence_no) % 500) + 1 as staff_no,
    activity_reasons.reason_options[((student_no + sequence_no * 3 - 1) % cardinality(activity_reasons.reason_options)) + 1] as reason
  from test_students
  cross join generate_series(1, 50) as sequence(sequence_no)
  cross join activity_reasons
)
insert into ledger_entries (
  id, account_id, amount, entry_type, status, description,
  created_by_user_id, created_at
)
select
  md5('loadtest.adjustment.' || entries.student_no::text || '.' || entries.sequence_no::text)::uuid,
  accounts.id,
  case when entries.is_positive
       then 3 + ((entries.student_no * 7 + entries.sequence_no * 13) % 23)
       else -(1 + ((entries.student_no * 5 + entries.sequence_no * 3) % 8))
  end,
  case when entries.is_positive then 'reward' else 'penalty' end,
  'posted',
  entries.reason,
  staff.user_id,
  now() - entries.age_days * interval '1 day' + entries.minute_offset * interval '1 minute'
from entries
join accounts on accounts.user_id = entries.user_id
join staff on staff.staff_no = entries.staff_no
on conflict (id) do nothing;

-- 6,000 requests, with matching pending/posted/voided ledger movements and
-- approver metadata. Unlimited items avoid synthetic inventory inconsistencies.
with items as (
  select
    shop_items.id as item_id,
    shop_items.price,
    row_number() over (order by shop_items.name)::integer as item_no
  from shop_items
  where shop_items.name like 'LOADTEST | %'
),
students as (
  select
    users.id as user_id,
    substring(users.username from '([0-9]{4})$')::integer as student_no
  from users
  where users.username like 'loadtest.student.%'
),
staff as (
  select
    users.id as user_id,
    substring(users.username from '([0-9]{4})$')::integer as staff_no
  from users
  where users.username like 'loadtest.staff.%'
),
requests as (
  select
    n,
    ((n - 1) % 1500) + 1 as student_no,
    ((n - 1) % 15) + 1 as item_no,
    ((n * 37) % 730) as age_days,
    case ((n - 1) / 1500)::integer
      when 0 then 'approved'
      when 1 then 'denied'
      when 2 then 'pending'
      else 'denied'
    end as status
  from generate_series(1, 6000) as series(n)
),
purchase_rows as (
  select
    requests.*,
    students.user_id as student_user_id,
    items.item_id,
    items.price,
    staff.user_id as approver_user_id,
    now() - requests.age_days * interval '1 day' as purchased_at
  from requests
  join students on students.student_no = requests.student_no
  join items on items.item_no = requests.item_no
  join staff on staff.staff_no = ((requests.n % 500) + 1)
)
insert into shop_purchases (
  id, shop_item_id, purchased_by_user_id, price_at_purchase, status,
  decided_by_user_id, decided_at, decision_note, stock_reserved,
  request_id, purchased_at
)
select
  md5('loadtest.purchase.' || purchase_rows.n::text)::uuid,
  purchase_rows.item_id,
  purchase_rows.student_user_id,
  purchase_rows.price,
  purchase_rows.status,
  case when purchase_rows.status = 'pending' then null else purchase_rows.approver_user_id end,
  case when purchase_rows.status = 'pending' then null
       else least(
         now(),
         purchase_rows.purchased_at + interval '1 day' + ((purchase_rows.n % 1440)::text || ' minutes')::interval
       )
  end,
  case when purchase_rows.status = 'denied' then 'Synthetic test decision.' else '' end,
  false,
  md5('loadtest.request.' || purchase_rows.n::text)::uuid,
  purchase_rows.purchased_at
from purchase_rows
on conflict (id) do nothing;

with purchases as (
  select
    shop_purchases.id as purchase_id,
    shop_purchases.purchased_by_user_id,
    shop_purchases.price_at_purchase,
    shop_purchases.status,
    shop_purchases.decided_by_user_id,
    shop_purchases.decided_at,
    shop_purchases.purchased_at,
    substring(users.username from '([0-9]{4})$')::integer as student_no,
    substring(shop_items.name from '[0-9]+$')::integer as item_no
  from shop_purchases
  join users on users.id = shop_purchases.purchased_by_user_id
  join shop_items on shop_items.id = shop_purchases.shop_item_id
  where shop_purchases.id in (
    select md5('loadtest.purchase.' || n::text)::uuid
    from generate_series(1, 6000) as series(n)
  )
)
insert into ledger_entries (
  id, account_id, amount, entry_type, status, description,
  related_entity_type, related_entity_id, created_by_user_id, created_at,
  is_voided, voided_by_user_id, voided_at, void_reason
)
select
  md5('loadtest.purchase-entry.' || purchases.purchase_id::text)::uuid,
  accounts.id,
  -purchases.price_at_purchase,
  case when purchases.status = 'approved' then 'shop_purchase' else 'shop_hold' end,
  case when purchases.status = 'approved' then 'posted'
       when purchases.status = 'denied' then 'voided'
       else 'pending' end,
  shop_items.name,
  'shop_purchase',
  purchases.purchase_id,
  purchases.purchased_by_user_id,
  purchases.purchased_at,
  purchases.status = 'denied',
  case when purchases.status = 'denied' then purchases.decided_by_user_id else null end,
  case when purchases.status = 'denied' then purchases.decided_at else null end,
  case when purchases.status = 'denied' then 'Synthetic test decision.' else '' end
from purchases
join accounts on accounts.user_id = purchases.purchased_by_user_id
join shop_purchases on shop_purchases.id = purchases.purchase_id
join shop_items on shop_items.id = shop_purchases.shop_item_id
on conflict (id) do nothing;

-- Keep reruns consistent with the intended one-approved-purchase-per-student
-- pattern, including if an earlier version of this test seed was already run.
with generated_requests as (
  select
    n,
    md5('loadtest.purchase.' || n::text)::uuid as purchase_id,
    case ((n - 1) / 1500)::integer
      when 0 then 'approved'
      when 1 then 'denied'
      when 2 then 'pending'
      else 'denied'
    end as status
  from generate_series(1, 6000) as series(n)
)
update shop_purchases
set status = generated_requests.status,
    decided_by_user_id = case
      when generated_requests.status = 'pending' then null
      else staff.id
    end,
    decided_at = case
      when generated_requests.status = 'pending' then null
      else least(
        now(),
        shop_purchases.purchased_at + interval '1 day' + ((generated_requests.n % 1440)::text || ' minutes')::interval
      )
    end,
    decision_note = case
      when generated_requests.status = 'denied' then 'Synthetic test decision.'
      else ''
    end
from generated_requests
left join users as staff
  on staff.username = 'loadtest.staff.' || lpad(((generated_requests.n % 500) + 1)::text, 4, '0')
where shop_purchases.id = generated_requests.purchase_id;

update ledger_entries
set entry_type = case when shop_purchases.status = 'approved' then 'shop_purchase' else 'shop_hold' end,
    status = case when shop_purchases.status = 'approved' then 'posted'
                  when shop_purchases.status = 'denied' then 'voided'
                  else 'pending' end,
    is_voided = shop_purchases.status = 'denied',
    voided_by_user_id = case when shop_purchases.status = 'denied' then shop_purchases.decided_by_user_id else null end,
    voided_at = case when shop_purchases.status = 'denied' then shop_purchases.decided_at else null end,
    void_reason = case when shop_purchases.status = 'denied' then shop_purchases.decision_note else '' end
from shop_purchases
where ledger_entries.related_entity_type = 'shop_purchase'
  and ledger_entries.related_entity_id = shop_purchases.id
  and shop_purchases.request_id in (
    select md5('loadtest.request.' || n::text)::uuid
    from generate_series(1, 6000) as series(n)
  );

commit;
