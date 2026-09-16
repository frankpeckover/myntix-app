# Notifications

Notifications are isolated under `src/domains/notifications`. Reward services publish events there; they do not send email directly.

## Database

Run these as the tenant database or schema owner, then rerun grants:

```txt
database/school/04-rewards.sql
database/school/07-notifications.sql
database/school/99-grants.sql
```

`07-notifications.sql` owns notification inboxes, user preferences, and digest delivery history.

## Email

Set these production environment variables:

```txt
EMAIL_FROM=Myntix <notifications@myntix.com>
RESEND_API_KEY=
NOTIFICATION_JOB_SECRET=
```

Use a long random value for `NOTIFICATION_JOB_SECRET`. The digest endpoint is:

```txt
POST /api/internal/jobs/notification-digests
Authorization: Bearer {NOTIFICATION_JOB_SECRET}
```

Invoke it once each morning with cron, a systemd timer, or another trusted scheduler. It processes all active platform tenants. Delivery records make same-day retries safe, and email is only sent when reward requests are awaiting approval.

Example manual test:

```bash
curl -X POST https://school.example.com/api/internal/jobs/notification-digests \
  -H "Authorization: Bearer $NOTIFICATION_JOB_SECRET"
```

Students receive in-app reward updates only. Staff can disable their daily email digest from their Settings page.

Teachers also receive an in-app reminder after each timetabled class ends to record any promised credit changes. These reminders are created per class and day, expire after 24 hours, and are never included in email digests.
