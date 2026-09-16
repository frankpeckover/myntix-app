import type { PoolClient } from "pg";
import {
  connectTenantBySlug,
  listActiveTenantReferences,
} from "@/lib/db";
import { appConfig } from "@/lib/app-config";
import { EmailService } from "@/domains/integrations/email-service";

type DigestRecipientRow = {
  email: string;
  first_name: string;
  user_id: string;
};

type WorkCountRow = {
  pending_count: number;
};

export type DigestRunSummary = {
  emailsFailed: number;
  emailsSent: number;
  organisationsFailed: number;
  organisationsProcessed: number;
};

const emailService = new EmailService();

export class NotificationDigestService {
  async sendDailyDigests(): Promise<DigestRunSummary> {
    const tenants = await listActiveTenantReferences();
    const summary: DigestRunSummary = {
      emailsFailed: 0,
      emailsSent: 0,
      organisationsFailed: 0,
      organisationsProcessed: 0,
    };

    for (const tenant of tenants) {
      let client: PoolClient | null = null;

      try {
        client = await connectTenantBySlug(tenant.slug);
        const lock = await client.query<{ acquired: boolean }>(
          `select pg_try_advisory_lock(hashtext('notification-digest')) as acquired`,
        );
        if (!lock.rows[0]?.acquired) {
          continue;
        }

        const result = await sendTenantDigests(client, tenant.primaryDomain);
        summary.emailsSent += result.sent;
        summary.emailsFailed += result.failed;
        summary.organisationsProcessed += 1;
      } catch (error) {
        summary.organisationsFailed += 1;
        console.error(`Notification digest failed for tenant ${tenant.slug}`, error);
      } finally {
        if (client) {
          await client
            .query(`select pg_advisory_unlock(hashtext('notification-digest'))`)
            .catch(() => undefined);
        }
        client?.release();
      }
    }

    return summary;
  }
}

async function sendTenantDigests(client: PoolClient, primaryDomain: string) {
  const countsResult = await client.query<WorkCountRow>(`
    select
      count(*) filter (where status = 'pending')::int as pending_count
    from shop_purchases
    where is_voided = false
      and requested_by_api_client_id is null
  `);
  const counts = countsResult.rows[0] ?? { pending_count: 0 };

  if (counts.pending_count === 0) {
    return { failed: 0, sent: 0 };
  }

  const schoolResult = await client.query<{ name: string }>(
    `select name from school_info where id = 1`,
  );
  const schoolName = schoolResult.rows[0]?.name?.trim() || "Your organisation";
  const recipients = await client.query<DigestRecipientRow>(`
    select users.id as user_id, users.first_name, users.email
    from users
    join roles on roles.id = users.role_id
    left join notification_preferences
      on notification_preferences.user_id = users.id
    left join notification_digest_deliveries
      on notification_digest_deliveries.user_id = users.id
     and notification_digest_deliveries.digest_date = current_date
    where users.is_active = true
      and roles.is_active = true
      and roles.role_key = 'teacher'
      and trim(users.email) <> ''
      and coalesce(notification_preferences.email_digest_enabled, true) = true
      and notification_digest_deliveries.id is null
    order by users.id
  `);

  let sent = 0;
  let failed = 0;
  const appUrl = buildTenantUrl(primaryDomain);

  for (const recipient of recipients.rows) {
    const email = buildDigestEmail({
      appUrl,
      firstName: recipient.first_name,
      pendingCount: counts.pending_count,
      schoolName,
    });
    const result = await emailService.sendEmail({
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: recipient.email,
    });

    if (!result.ok) {
      failed += 1;
      continue;
    }

    await client.query(
      `
        insert into notification_digest_deliveries (
          user_id, digest_date, pending_approval_count
        )
        values ($1, current_date, $2)
        on conflict (user_id, digest_date) do nothing
      `,
      [recipient.user_id, counts.pending_count],
    );
    sent += 1;
  }

  return { failed, sent };
}

function buildDigestEmail(input: {
  appUrl: string;
  firstName: string;
  pendingCount: number;
  schoolName: string;
}) {
  const greeting = input.firstName.trim()
    ? `Hi ${input.firstName.trim()},`
    : "Hello,";
  const summary = `${input.pendingCount} reward request${input.pendingCount === 1 ? "" : "s"} awaiting approval`;
  const subject = `${input.schoolName}: rewards need attention`;
  const text = `${greeting}\n\n${summary}.\n\nOpen ${appConfig.name}: ${input.appUrl}\n\nYou can turn off this digest in Settings.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#173b40;max-width:560px">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(summary)}.</p>
      <p><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#173b40;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px">Open ${escapeHtml(appConfig.name)}</a></p>
      <p style="color:#667773;font-size:13px">You can turn off this digest in Settings.</p>
    </div>
  `;

  return { html, subject, text };
}

function buildTenantUrl(primaryDomain: string) {
  const domain = primaryDomain.trim();

  if (!domain) {
    return process.env.APP_BASE_URL ?? "";
  }
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain;
  }

  return `${process.env.NODE_ENV === "production" ? "https" : "http"}://${domain}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
