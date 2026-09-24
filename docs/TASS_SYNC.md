# TASS Sync

Myntix can use the TASS LMS Integration API as an authoritative source for
students, teachers, classes, memberships, and teacher timetables.

## Database setup

Run `database/school/09-directory-sync.sql` against the organisation database
or schema, then rerun `database/school/99-grants.sql` for an existing tenant.
New tenants receive the required grants when `99-grants.sql` is run last.

## TASS setup

In TASS.web, configure an API application for the LMS Integration API and give
its security role read access to:

- current students and teachers
- student subjects
- teacher timetables

Record the TASS API URL, company code, application code, and token key. Enter
these under Admin Settings > Sync Sources > TASS. The token key is encrypted
before it is stored and is never returned to the browser.

## Ownership and safety

- TASS students map to the `student` role.
- TASS teachers map to the `teacher` role.
- Administrator access is always assigned manually in Myntix.
- A stable TASS source identifier is stored for each managed user, group, and
  timetable entry.
- Archival only affects records owned by the TASS source. Manual records are
  not archived, and administrator accounts are never archived.
- Each sync applies in one database transaction. A failed run does not leave a
  partially imported snapshot.

Save the settings, test the connection, then run **Sync Now** to validate the
first import. Automatic syncs run once during each organisation's local
midnight hour. The organisation timezone is configured in Admin Settings;
blank timezones fall back to UTC.

## Scheduler

The scheduler starts with the Myntix Node.js server and checks for due syncs
every 15 minutes. No cron job or separate worker configuration is required.
It checks every active tenant and skips tenants that are disabled, already
synced today, or outside their local midnight hour.

The first check runs 30 seconds after server startup. Database claims prevent
duplicate work after restarts or when more than one app process is running.

## Optional external trigger

The authenticated internal endpoint remains available for deployments that
later move scheduled work to a dedicated worker. Set `INTERNAL_JOB_SECRET` and
call:

```txt
POST /api/internal/jobs/directory-sync
Authorization: Bearer {INTERNAL_JOB_SECRET}
```

The `npm run sync:tass` command invokes this endpoint and loads the same
environment files as the production server.
