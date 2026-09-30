-- Realistic Myntix demonstration dataset.
-- All demo users have the password: Demo123!
-- This script is rerunnable and must never be used for a production tenant.

begin;

-- A fictional Australian secondary school profile.
update school_info
set name = 'Riverside College',
    address = '18 Banksia Avenue, Northbridge QLD 4000',
    contact_email = 'office@demo.myntix.com',
    phone = '(07) 5550 2180',
    website = 'https://demo.myntix.com',
    timezone = 'Australia/Brisbane',
    currency_name = 'River Points',
    balance_cap = 1000,
    updated_at = now()
where id = 1;

-- Every account deliberately shares one memorable password for demonstrations.
with demo_users (role_key, username, first_name, last_name, email, card_number) as (
  values
    ('admin',   'olivia.bennett', 'Olivia', 'Bennett', 'olivia.bennett@demo.myntix.com', ''),
    ('teacher', 'amelia.hart',    'Amelia', 'Hart',    'amelia.hart@demo.myntix.com', ''),
    ('teacher', 'marcus.chen',    'Marcus', 'Chen',    'marcus.chen@demo.myntix.com', ''),
    ('teacher', 'priya.nair',     'Priya',  'Nair',    'priya.nair@demo.myntix.com', ''),
    ('teacher', 'daniel.brooks',  'Daniel', 'Brooks',  'daniel.brooks@demo.myntix.com', ''),
    ('teacher', 'sophie.nguyen',  'Sophie', 'Nguyen',  'sophie.nguyen@demo.myntix.com', ''),
    ('teacher', 'liam.oconnor',   'Liam',   'O''Connor','liam.oconnor@demo.myntix.com', ''),
    ('student', 'ava.thompson',   'Ava',    'Thompson','ava.thompson@demo.myntix.com', '70000001'),
    ('student', 'noah.williams',  'Noah',   'Williams','noah.williams@demo.myntix.com', '70000002'),
    ('student', 'mia.patel',      'Mia',    'Patel',   'mia.patel@demo.myntix.com', '70000003'),
    ('student', 'ethan.nguyen',   'Ethan',  'Nguyen',  'ethan.nguyen@demo.myntix.com', '70000004'),
    ('student', 'isla.robinson',  'Isla',   'Robinson','isla.robinson@demo.myntix.com', '70000005'),
    ('student', 'lucas.chen',     'Lucas',  'Chen',    'lucas.chen@demo.myntix.com', '70000006'),
    ('student', 'zoe.martin',     'Zoe',    'Martin',  'zoe.martin@demo.myntix.com', '70000007'),
    ('student', 'jack.wilson',    'Jack',   'Wilson',  'jack.wilson@demo.myntix.com', '70000008'),
    ('student', 'grace.kim',      'Grace',  'Kim',     'grace.kim@demo.myntix.com', '70000009'),
    ('student', 'oliver.singh',   'Oliver', 'Singh',   'oliver.singh@demo.myntix.com', '70000010'),
    ('student', 'ruby.harris',    'Ruby',   'Harris',  'ruby.harris@demo.myntix.com', '70000011'),
    ('student', 'henry.walker',   'Henry',  'Walker',  'henry.walker@demo.myntix.com', '70000012'),
    ('student', 'lily.anderson',  'Lily',   'Anderson','lily.anderson@demo.myntix.com', '70000013'),
    ('student', 'william.lee',    'William','Lee',     'william.lee@demo.myntix.com', '70000014'),
    ('student', 'chloe.taylor',   'Chloe',  'Taylor',  'chloe.taylor@demo.myntix.com', '70000015'),
    ('student', 'james.brown',    'James',  'Brown',   'james.brown@demo.myntix.com', '70000016'),
    ('student', 'sienna.clark',   'Sienna', 'Clark',   'sienna.clark@demo.myntix.com', '70000017'),
    ('student', 'leo.martinez',   'Leo',    'Martinez','leo.martinez@demo.myntix.com', '70000018'),
    ('student', 'matilda.jones',  'Matilda','Jones',   'matilda.jones@demo.myntix.com', '70000019'),
    ('student', 'charlie.white',  'Charlie','White',   'charlie.white@demo.myntix.com', '70000020'),
    ('student', 'evie.moore',     'Evie',   'Moore',   'evie.moore@demo.myntix.com', '70000021'),
    ('student', 'thomas.king',    'Thomas', 'King',    'thomas.king@demo.myntix.com', '70000022'),
    ('student', 'layla.young',    'Layla',  'Young',   'layla.young@demo.myntix.com', '70000023'),
    ('student', 'samuel.scott',   'Samuel', 'Scott',   'samuel.scott@demo.myntix.com', '70000024'),
    ('student', 'hannah.green',   'Hannah', 'Green',   'hannah.green@demo.myntix.com', '70000025'),
    ('student', 'max.turner',     'Max',    'Turner',  'max.turner@demo.myntix.com', '70000026'),
    ('student', 'ella.baker',     'Ella',   'Baker',   'ella.baker@demo.myntix.com', '70000027'),
    ('student', 'lachlan.hall',   'Lachlan','Hall',    'lachlan.hall@demo.myntix.com', '70000028'),
    ('student', 'scarlett.evans', 'Scarlett','Evans', 'scarlett.evans@demo.myntix.com', '70000029'),
    ('student', 'harry.campbell', 'Harry',  'Campbell','harry.campbell@demo.myntix.com', '70000030'),
    ('student', 'maya.collins',   'Maya',   'Collins', 'maya.collins@demo.myntix.com', '70000031'),
    ('student', 'archie.mitchell','Archie', 'Mitchell','archie.mitchell@demo.myntix.com', '70000032'),
    ('student', 'georgia.phillips','Georgia','Phillips','georgia.phillips@demo.myntix.com', '70000033'),
    ('student', 'xavier.parker',  'Xavier', 'Parker',  'xavier.parker@demo.myntix.com', '70000034'),
    ('student', 'sofia.murphy',   'Sofia',  'Murphy',  'sofia.murphy@demo.myntix.com', '70000035'),
    ('student', 'felix.edwards',  'Felix',  'Edwards', 'felix.edwards@demo.myntix.com', '70000036')
)
insert into users (
  role_id, username, first_name, last_name, email, card_number, password_hash,
  is_active, created_at, updated_at
)
select roles.id,
       demo_users.username,
       demo_users.first_name,
       demo_users.last_name,
       demo_users.email,
       demo_users.card_number,
       'scrypt:v1:6d796e7469782d64656d6f2d75736572732d7631:1eac81894e7702e0b5372f6e583512b552d3f3ee7883b0c4b287dafc97bf26ae481bb0578ad5b8d1a403a709025687b1b116f77968dfdd3ed4d10f51642edacf',
       true,
       now() - interval '120 days',
       now()
from demo_users
join roles on roles.role_key = demo_users.role_key
on conflict (username) do update
set role_id = excluded.role_id,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    card_number = excluded.card_number,
    password_hash = excluded.password_hash,
    is_active = true,
    updated_at = now();

insert into accounts (user_id, account_name, is_active)
select users.id, 'Primary account', true
from users
join roles on roles.id = users.role_id
where roles.role_key = 'student'
  and users.email like '%@demo.myntix.com'
on conflict (user_id) do update
set account_name = excluded.account_name,
    is_active = true,
    updated_at = now();

insert into student_groups (name, description, is_active)
values
  ('Year 7A', 'Year 7 homeroom group led by Amelia Hart.', true),
  ('Year 7B', 'Year 7 homeroom group led by Marcus Chen.', true),
  ('Year 8A', 'Year 8 homeroom group led by Priya Nair.', true),
  ('STEM Club', 'Students participating in the weekly STEM enrichment program.', true),
  ('Student Leaders', 'Peer mentors and student representative leaders.', true),
  ('Homework Hub', 'Optional after-school study and support group.', true)
on conflict (name) do update
set description = excluded.description,
    is_active = true,
    updated_at = now();

delete from student_group_memberships
where group_id in (
  select id from student_groups
  where name in ('Year 7A', 'Year 7B', 'Year 8A', 'STEM Club', 'Student Leaders', 'Homework Hub')
);

with memberships (group_name, username) as (
  values
    ('Year 7A','ava.thompson'), ('Year 7A','noah.williams'),
    ('Year 7A','mia.patel'), ('Year 7A','ethan.nguyen'),
    ('Year 7A','isla.robinson'), ('Year 7A','lucas.chen'),
    ('Year 7A','zoe.martin'), ('Year 7A','jack.wilson'),
    ('Year 7A','grace.kim'), ('Year 7A','oliver.singh'),
    ('Year 7A','ruby.harris'), ('Year 7A','henry.walker'),
    ('Year 7B','lily.anderson'), ('Year 7B','william.lee'),
    ('Year 7B','chloe.taylor'), ('Year 7B','james.brown'),
    ('Year 7B','sienna.clark'), ('Year 7B','leo.martinez'),
    ('Year 7B','matilda.jones'), ('Year 7B','charlie.white'),
    ('Year 7B','evie.moore'), ('Year 7B','thomas.king'),
    ('Year 7B','layla.young'), ('Year 7B','samuel.scott'),
    ('Year 8A','hannah.green'), ('Year 8A','max.turner'),
    ('Year 8A','ella.baker'), ('Year 8A','lachlan.hall'),
    ('Year 8A','scarlett.evans'), ('Year 8A','harry.campbell'),
    ('Year 8A','maya.collins'), ('Year 8A','archie.mitchell'),
    ('Year 8A','georgia.phillips'), ('Year 8A','xavier.parker'),
    ('Year 8A','sofia.murphy'), ('Year 8A','felix.edwards'),
    ('STEM Club','mia.patel'), ('STEM Club','lucas.chen'),
    ('STEM Club','grace.kim'), ('STEM Club','william.lee'),
    ('STEM Club','leo.martinez'), ('STEM Club','hannah.green'),
    ('STEM Club','maya.collins'), ('STEM Club','xavier.parker'),
    ('Student Leaders','ava.thompson'), ('Student Leaders','oliver.singh'),
    ('Student Leaders','lily.anderson'), ('Student Leaders','matilda.jones'),
    ('Student Leaders','hannah.green'), ('Student Leaders','georgia.phillips'),
    ('Homework Hub','noah.williams'), ('Homework Hub','ethan.nguyen'),
    ('Homework Hub','ruby.harris'), ('Homework Hub','james.brown'),
    ('Homework Hub','evie.moore'), ('Homework Hub','max.turner'),
    ('Homework Hub','harry.campbell'), ('Homework Hub','felix.edwards')
)
insert into student_group_memberships (group_id, user_id, created_at)
select student_groups.id, users.id, now() - interval '90 days'
from memberships
join student_groups on student_groups.name = memberships.group_name
join users on users.username = memberships.username
on conflict (group_id, user_id) do nothing;

-- Refresh only timetable entries belonging to the seeded staff and groups.
delete from timetable_entries
where teacher_user_id in (
    select id from users where email like '%@demo.myntix.com'
  )
  and group_id in (
    select id from student_groups
    where name in ('Year 7A', 'Year 7B', 'Year 8A', 'STEM Club', 'Student Leaders', 'Homework Hub')
  );

with lessons (teacher_username, group_name, day_of_week, start_time, end_time) as (
  values
    ('amelia.hart','Year 7A',1,'08:40'::time,'09:40'::time),
    ('amelia.hart','Year 7A',2,'10:00'::time,'11:00'::time),
    ('amelia.hart','Year 7A',3,'08:40'::time,'09:40'::time),
    ('amelia.hart','Year 7A',4,'11:40'::time,'12:40'::time),
    ('amelia.hart','Year 7A',5,'09:40'::time,'10:40'::time),
    ('marcus.chen','Year 7B',1,'09:40'::time,'10:40'::time),
    ('marcus.chen','Year 7B',2,'08:40'::time,'09:40'::time),
    ('marcus.chen','Year 7B',3,'11:40'::time,'12:40'::time),
    ('marcus.chen','Year 7B',4,'10:00'::time,'11:00'::time),
    ('marcus.chen','Year 7B',5,'13:30'::time,'14:30'::time),
    ('priya.nair','Year 8A',1,'11:40'::time,'12:40'::time),
    ('priya.nair','Year 8A',2,'13:30'::time,'14:30'::time),
    ('priya.nair','Year 8A',3,'09:40'::time,'10:40'::time),
    ('priya.nair','Year 8A',4,'08:40'::time,'09:40'::time),
    ('priya.nair','Year 8A',5,'10:00'::time,'11:00'::time),
    ('daniel.brooks','STEM Club',2,'14:35'::time,'15:25'::time),
    ('daniel.brooks','STEM Club',4,'14:35'::time,'15:25'::time),
    ('sophie.nguyen','Student Leaders',3,'13:30'::time,'14:30'::time),
    ('liam.oconnor','Homework Hub',1,'15:30'::time,'16:20'::time),
    ('liam.oconnor','Homework Hub',4,'15:30'::time,'16:20'::time)
)
insert into timetable_entries (
  teacher_user_id, group_id, day_of_week, start_time, end_time, is_active
)
select users.id,
       student_groups.id,
       lessons.day_of_week,
       lessons.start_time,
       lessons.end_time,
       true
from lessons
join users on users.username = lessons.teacher_username
join student_groups on student_groups.name = lessons.group_name;

-- Refresh seeded ledger activity so chart dates remain useful whenever rerun.
delete from ledger_entry_receipts
where ledger_entry_id in (
  select id from ledger_entries where related_entity_type = 'demo_seed'
);
delete from ledger_entries where related_entity_type = 'demo_seed';

with demo_students as (
  select users.id as user_id,
         users.username,
         accounts.id as account_id,
         row_number() over (order by users.username) as student_number
  from users
  join roles on roles.id = users.role_id and roles.role_key = 'student'
  join accounts on accounts.user_id = users.id
  where users.email like '%@demo.myntix.com'
), demo_teachers as (
  select array_agg(id order by username) as ids
  from users
  where username in ('amelia.hart','marcus.chen','priya.nair','daniel.brooks','sophie.nguyen','liam.oconnor')
)
insert into ledger_entries (
  account_id, amount, entry_type, status, description,
  related_entity_type, related_entity_id, created_by_user_id, created_at
)
select demo_students.account_id,
       80 + ((demo_students.student_number * 7) % 45),
       'credit',
       'posted',
       'Welcome balance',
       'demo_seed',
       md5('welcome:' || demo_students.username)::uuid,
       demo_teachers.ids[1 + ((demo_students.student_number - 1) % 6)],
       now() - interval '88 days' + (demo_students.student_number % 5) * interval '1 hour'
from demo_students
cross join demo_teachers;

with demo_students as (
  select users.id as user_id,
         users.username,
         accounts.id as account_id,
         row_number() over (order by users.username) as student_number
  from users
  join roles on roles.id = users.role_id and roles.role_key = 'student'
  join accounts on accounts.user_id = users.id
  where users.email like '%@demo.myntix.com'
), demo_teachers as (
  select array_agg(id order by username) as ids
  from users
  where username in ('amelia.hart','marcus.chen','priya.nair','daniel.brooks','sophie.nguyen','liam.oconnor')
), activity as (
  select demo_students.*,
         series.activity_number,
         (demo_students.student_number + series.activity_number) % 9 as activity_kind
  from demo_students
  cross join generate_series(1, 15) as series(activity_number)
)
insert into ledger_entries (
  account_id, amount, entry_type, status, description,
  related_entity_type, related_entity_id, created_by_user_id, created_at
)
select activity.account_id,
       case activity.activity_kind
         when 0 then -5
         when 1 then 5
         when 2 then 10
         when 3 then 10
         when 4 then 15
         when 5 then 20
         when 6 then 5
         when 7 then 25
         else -10
       end,
       case when activity.activity_kind in (0, 8) then 'penalty' else 'reward' end,
       'posted',
       case activity.activity_kind
         when 0 then 'Late to class'
         when 1 then 'Prepared for learning'
         when 2 then 'Helping a classmate'
         when 3 then 'Homework completed'
         when 4 then 'Excellent class participation'
         when 5 then 'Outstanding effort'
         when 6 then 'Positive behaviour'
         when 7 then 'Community contribution'
         else 'Class disruption'
       end,
       'demo_seed',
       md5('activity:' || activity.username || ':' || activity.activity_number)::uuid,
       demo_teachers.ids[1 + ((activity.student_number + activity.activity_number) % 6)],
       date_trunc('day', now())
         - (76 - activity.activity_number * 5) * interval '1 day'
         + (8 + ((activity.student_number + activity.activity_number) % 7)) * interval '1 hour'
         + (activity.student_number % 4) * interval '7 minutes'
from activity
cross join demo_teachers;

with goal_students as (
  select users.id,
         row_number() over (order by users.username) as student_number
  from users
  join roles on roles.id = users.role_id and roles.role_key = 'student'
  where users.email like '%@demo.myntix.com'
)
insert into student_goals (user_id, title, target_amount)
select goal_students.id,
       case goal_students.student_number % 5
         when 0 then 'Movie pass'
         when 1 then 'Prize draw'
         when 2 then 'Lunch voucher'
         when 3 then 'VIP seating'
         else 'Mystery prize'
       end,
       300 + (goal_students.student_number % 5) * 50
from goal_students
on conflict (user_id) do update
set title = excluded.title,
    target_amount = excluded.target_amount,
    updated_at = now();

insert into shop_items (
  name, description, image_url, price, quantity, is_quantity_unlimited, is_active
)
values
  ('Canteen snack voucher', 'Choose one snack from the participating canteen range.', '', 40, 60, false, true),
  ('Canteen queue pass', 'Move to the priority line once during lunch service.', '', 65, 0, true, true),
  ('Sports equipment hire', 'Borrow premium sports equipment for one lunch break.', '', 45, 0, true, true),
  ('Library choice pass', 'Choose the featured book display for one week.', '', 55, 0, true, true),
  ('Stationery pack', 'A school stationery pack with pens, pencils and a notebook.', '', 80, 24, false, true),
  ('Art studio session', 'Join a supervised lunchtime art studio session.', '', 90, 16, false, true),
  ('Extra computer time', 'Thirty minutes of supervised recreation computer time.', '', 110, 0, true, true),
  ('VIP event seating', 'Reserve a premium seat at the next school assembly or event.', '', 140, 12, false, true),
  ('Mystery prize', 'A surprise reward selected from the current prize collection.', '', 180, 18, false, true),
  ('Principal morning tea', 'Attend a small group morning tea with the principal.', '', 250, 8, false, true)
on conflict (name) do update
set description = excluded.description,
    image_url = excluded.image_url,
    price = excluded.price,
    quantity = excluded.quantity,
    is_quantity_unlimited = excluded.is_quantity_unlimited,
    is_active = true,
    updated_at = now();

-- Remove and recreate only purchases carrying deterministic demo IDs.
delete from notifications
where entity_type = 'shop_purchase'
  and entity_id in (
    select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
  );
delete from account_holds
where related_purchase_id in (
  select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
);
delete from ledger_entries
where related_entity_type = 'shop_purchase'
  and related_entity_id in (
    select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
  );
delete from shop_purchases
where id in (
  select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
);

with purchases (number, item_name, username, status, days_ago, decision_note) as (
  values
    (1, 'Canteen snack voucher', 'ava.thompson', 'approved', 24, 'Approved for collection.'),
    (2, 'Sports equipment hire', 'lucas.chen', 'approved', 18, 'Approved for Friday lunch.'),
    (3, 'Stationery pack', 'lily.anderson', 'approved', 13, 'Collect from student services.'),
    (4, 'Art studio session', 'matilda.jones', 'approved', 8, 'Added to the next session.'),
    (5, 'VIP event seating', 'hannah.green', 'approved', 4, 'Reserved for the next assembly.'),
    (6, 'Mystery prize', 'noah.williams', 'denied', 11, 'Please build a little more balance first.'),
    (7, 'Principal morning tea', 'max.turner', 'denied', 6, 'This session is currently full.'),
    (8, 'Canteen snack voucher', 'mia.patel', 'pending', 2, ''),
    (9, 'Extra computer time', 'charlie.white', 'pending', 1, ''),
    (10, 'Stationery pack', 'sofia.murphy', 'pending', 0, '')
)
insert into shop_purchases (
  id, shop_item_id, purchased_by_user_id, price_at_purchase, status,
  decided_by_user_id, decided_at, decision_note, stock_reserved,
  is_voided, purchased_at
)
select md5('demo-purchase:' || purchases.number)::uuid,
       shop_items.id,
       students.id,
       shop_items.price,
       purchases.status,
       case when purchases.status = 'pending' then null else teachers.id end,
       case when purchases.status = 'pending' then null else now() - (purchases.days_ago - 1) * interval '1 day' end,
       purchases.decision_note,
       not shop_items.is_quantity_unlimited,
       false,
       now() - purchases.days_ago * interval '1 day' - interval '2 hours'
from purchases
join shop_items on shop_items.name = purchases.item_name
join users students on students.username = purchases.username
cross join lateral (
  select id from users where username = 'marcus.chen'
) teachers;

insert into ledger_entries (
  account_id, amount, entry_type, status, description,
  related_entity_type, related_entity_id, created_by_user_id, created_at,
  is_voided, voided_by_user_id, voided_at, void_reason
)
select accounts.id,
       -shop_purchases.price_at_purchase,
       case when shop_purchases.status = 'approved' then 'shop_purchase' else 'shop_hold' end,
       case when shop_purchases.status = 'denied' then 'voided'
            when shop_purchases.status = 'pending' then 'pending'
            else 'posted' end,
       shop_items.name,
       'shop_purchase',
       shop_purchases.id,
       shop_purchases.purchased_by_user_id,
       shop_purchases.purchased_at,
       shop_purchases.status = 'denied',
       case when shop_purchases.status = 'denied' then shop_purchases.decided_by_user_id else null end,
       case when shop_purchases.status = 'denied' then shop_purchases.decided_at else null end,
       case when shop_purchases.status = 'denied' then shop_purchases.decision_note else '' end
from shop_purchases
join accounts on accounts.user_id = shop_purchases.purchased_by_user_id
join shop_items on shop_items.id = shop_purchases.shop_item_id
where shop_purchases.id in (
  select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
);

delete from audit_log where details ->> 'dataset' = 'myntix_demo';

with demo_events (action, entity_type, actor_username, description, hours_ago) as (
  values
    ('shop_purchase.requested', 'shop_purchase', 'sofia.murphy', 'Requested Stationery pack', 3),
    ('transaction.created', 'ledger_entry', 'amelia.hart', 'Issued points to Year 7A', 5),
    ('shop_purchase.approved', 'shop_purchase', 'marcus.chen', 'Approved VIP event seating', 28),
    ('transaction.created', 'ledger_entry', 'priya.nair', 'Issued points for class participation', 31),
    ('group.members.updated', 'student_group', 'olivia.bennett', 'Updated STEM Club members', 50),
    ('shop_purchase.denied', 'shop_purchase', 'marcus.chen', 'Declined a full event request', 74),
    ('transaction.created', 'ledger_entry', 'daniel.brooks', 'Issued STEM Club participation points', 78),
    ('timetable.updated', 'timetable_entry', 'olivia.bennett', 'Updated Homework Hub timetable', 102),
    ('user.updated', 'user', 'olivia.bennett', 'Updated a student card number', 126),
    ('transaction.created', 'ledger_entry', 'sophie.nguyen', 'Issued student leadership points', 150)
)
insert into audit_log (actor_user_id, action, entity_type, details, created_at)
select users.id,
       demo_events.action,
       demo_events.entity_type,
       jsonb_build_object(
         'dataset', 'myntix_demo',
         'summary', demo_events.description
       ),
       now() - demo_events.hours_ago * interval '1 hour'
from demo_events
join users on users.username = demo_events.actor_username;

-- Opt one teacher into grouped in-app reminders to demonstrate the bell centre.
insert into notification_preferences (
  user_id, email_digest_enabled, reward_request_notification_mode
)
select id, false, 'in_app'
from users
where username = 'amelia.hart'
on conflict (user_id) do update
set email_digest_enabled = false,
    reward_request_notification_mode = 'in_app',
    updated_at = now();

commit;

-- Compact result summary for DBeaver and psql.
select 'users' as dataset, count(*)::text as records
from users where email like '%@demo.myntix.com'
union all
select 'groups', count(*)::text from student_groups
where name in ('Year 7A', 'Year 7B', 'Year 8A', 'STEM Club', 'Student Leaders', 'Homework Hub')
union all
select 'timetable entries', count(*)::text from timetable_entries
where teacher_user_id in (select id from users where email like '%@demo.myntix.com')
union all
select 'ledger entries', count(*)::text from ledger_entries
where related_entity_type = 'demo_seed'
   or related_entity_id in (
     select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
   )
union all
select 'rewards', count(*)::text from shop_items
where name in (
  'Canteen snack voucher', 'Canteen queue pass', 'Sports equipment hire',
  'Library choice pass', 'Stationery pack', 'Art studio session',
  'Extra computer time', 'VIP event seating', 'Mystery prize',
  'Principal morning tea'
)
union all
select 'reward requests', count(*)::text from shop_purchases
where id in (
  select md5('demo-purchase:' || number)::uuid from generate_series(1, 10) as number
);
