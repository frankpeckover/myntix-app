# Notifications

Notifications are isolated under `src/domains/notifications`. Reward services publish events there; they do not send email directly.

## Database

Run these as the tenant database or schema owner, then rerun grants:

```txt
infrastructure/database/tenant/04-rewards.sql
infrastructure/database/tenant/07-notifications.sql
infrastructure/database/tenant/99-access.sql
```

`07-notifications.sql` owns notification inboxes, user preferences, and digest delivery history.

## Email

Set these production environment variables:

```txt
EMAIL_FROM=Myntix <notifications@myntix.com>
RESEND_API_KEY=
INTERNAL_JOB_SECRET=
```

Verify the sending domain in Resend and set `EMAIL_FROM` to an address on that
domain. The same Resend transport sends branded password-reset messages and
staff notification digests. Password-reset links use the organisation hostname
from the request, so each tenant returns to its own sign-in domain.

Use a long random value for `INTERNAL_JOB_SECRET`. The digest endpoint is:

```txt
POST /api/internal/jobs/notification-digests
Authorization: Bearer {INTERNAL_JOB_SECRET}
```

Invoke it once each morning with cron, a systemd timer, or another trusted scheduler. It processes all active platform tenants. Delivery records make retries safe, and each opted-in teacher receives at most one email every seven days while reward requests are awaiting approval.

Example manual test:

```bash
curl -X POST https://school.example.com/api/internal/jobs/notification-digests \
  -H "Authorization: Bearer $INTERNAL_JOB_SECRET"
```

Students receive in-app reward updates only. Staff can choose `Off`, `In-app`, or `In-app + weekly digest` from Preferences. Reward request alerts are grouped into one work-queue notification and default to off.

Teachers also receive an in-app reminder after each timetabled class ends to record any promised credit changes. These reminders are created per class and day, expire after 24 hours, and are never included in email digests.
