# Demo dataset

`seed-demo-data.sql` creates a realistic fictional school dataset for product
demos. It is safe to rerun: seeded transactions, purchases, timetable entries,
memberships, and audit events are refreshed while unrelated records are left
alone.

## Login details

All seeded users use the same password:

```text
Demo123!
```

Useful accounts:

```text
Admin:   olivia.bennett
Teacher: amelia.hart
Teacher: marcus.chen
Student: ava.thompson
Student: noah.williams
```

All demo email addresses use the reserved application subdomain
`demo.myntix.com`; they are examples and should not receive real email.

## Run it

Run all school setup scripts first, then execute `seed-demo-data.sql` against
the intended school database or tenant schema. In DBeaver, set the active
schema before running it. For a schema tenant, this is equivalent to:

```sql
set search_path to your_tenant_schema, public;
```

Never run this dataset against a production organisation.
