import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { isTeacher } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type {
  AppNotification,
  NotificationActionTarget,
  NotificationPreferences,
} from "@/domains/notifications/notification-types";

type NotificationRow = {
  action_target: NotificationActionTarget;
  created_at: Date;
  id: string;
  message: string;
  read_at: Date | null;
  title: string;
  type: string;
};

type RewardWorkCounts = {
  pending_count: number;
};

const notificationLimit = 30;

export class NotificationService {
  async listForUser(currentUser: SessionUser): Promise<AppNotification[]> {
    await db.query(`
      delete from notifications
      where recipient_user_id = $1
        and (
          (expires_at is not null and expires_at <= now())
          or (read_at is not null and read_at < now() - interval '90 days')
        )
    `, [currentUser.id]);

    if (isTeacher(currentUser)) {
      await this.syncRewardWorkReminder(currentUser.id);
      await this.syncFinishedClassReminders(currentUser.id);
    }

    const result = await db.query<NotificationRow>(
      `
        select id, type, title, message, action_target, read_at, created_at
        from notifications
        where recipient_user_id = $1
          and (expires_at is null or expires_at > now())
        order by read_at nulls first, created_at desc
        limit $2
      `,
      [currentUser.id, notificationLimit],
    );

    return result.rows.map(mapNotificationRow);
  }

  async markRead(currentUser: SessionUser, notificationId: string) {
    await db.query(
      `
        update notifications
        set read_at = coalesce(read_at, now())
        where id = $1
          and recipient_user_id = $2
      `,
      [notificationId, currentUser.id],
    );
  }

  async markAllRead(currentUser: SessionUser) {
    await db.query(
      `
        update notifications
        set read_at = now()
        where recipient_user_id = $1
          and read_at is null
      `,
      [currentUser.id],
    );
  }

  async getPreferences(
    currentUser: SessionUser,
  ): Promise<NotificationPreferences> {
    const result = await db.query<{ email_digest_enabled: boolean }>(
      `
        select email_digest_enabled
        from notification_preferences
        where user_id = $1
      `,
      [currentUser.id],
    );

    return {
      emailDigestEnabled: result.rows[0]?.email_digest_enabled ?? true,
    };
  }

  async updatePreferences(
    currentUser: SessionUser,
    preferences: NotificationPreferences,
  ) {
    await db.query(
      `
        insert into notification_preferences (user_id, email_digest_enabled)
        values ($1, $2)
        on conflict (user_id) do update
        set email_digest_enabled = excluded.email_digest_enabled,
            updated_at = now()
      `,
      [currentUser.id, preferences.emailDigestEnabled],
    );
  }

  async notifyRewardRequested(
    client: PoolClient,
    input: {
      itemName: string;
      purchaseId: string;
      studentName: string;
    },
  ) {
    await client.query(
      `
        insert into notifications (
          recipient_user_id, type, title, message, action_target,
          entity_type, entity_id, dedupe_key
        )
        select users.id,
               'reward.requested',
               'Reward request waiting',
               $1,
               'Rewards',
               'shop_purchase',
               $2,
               $3
        from users
        join roles on roles.id = users.role_id
        where users.is_active = true
          and roles.is_active = true
          and roles.role_key = 'teacher'
        on conflict (recipient_user_id, dedupe_key)
          where dedupe_key is not null
        do nothing
      `,
      [
        `${input.studentName} requested ${input.itemName}.`,
        input.purchaseId,
        `reward-request:${input.purchaseId}`,
      ],
    );
  }

  async notifyRewardDecision(
    client: PoolClient,
    input: {
      itemName: string;
      purchaseId: string;
      status: "approved" | "denied";
      studentUserId: string;
    },
  ) {
    const isApproved = input.status === "approved";

    await insertNotification(client, {
      actionTarget: "Rewards",
      dedupeKey: `reward-decision:${input.purchaseId}`,
      entityId: input.purchaseId,
      entityType: "shop_purchase",
      message: isApproved
        ? `${input.itemName} is ready to collect.`
        : `${input.itemName} was not approved. Any reserved credits have been returned.`,
      recipientUserId: input.studentUserId,
      title: isApproved ? "Reward approved" : "Reward request declined",
      type: isApproved ? "reward.approved" : "reward.denied",
    });
  }

  private async syncRewardWorkReminder(userId: string) {
    const result = await db.query<RewardWorkCounts>(`
      select
        count(*) filter (where status = 'pending')::int as pending_count
      from shop_purchases
      where is_voided = false
        and requested_by_api_client_id is null
    `);
    const counts = result.rows[0] ?? { pending_count: 0 };

    if (counts.pending_count === 0) {
      await db.query(
        `delete from notifications where recipient_user_id = $1 and dedupe_key = 'reward-work-queue'`,
        [userId],
      );
      return;
    }

    const message = formatRewardWorkMessage(counts);
    await db.query(
      `
        insert into notifications (
          recipient_user_id, type, title, message, action_target, dedupe_key
        )
        values ($1, 'reward.work_queue', 'Rewards need attention', $2, 'Rewards', 'reward-work-queue')
        on conflict (recipient_user_id, dedupe_key)
          where dedupe_key is not null
        do update
        set message = excluded.message,
            read_at = case
              when notifications.message = excluded.message then notifications.read_at
              else null
            end,
            created_at = case
              when notifications.message = excluded.message then notifications.created_at
              else now()
            end
      `,
      [userId, message],
    );
  }

  private async syncFinishedClassReminders(userId: string) {
    const tableResult = await db.query<{ is_available: boolean }>(
      `select to_regclass('timetable_entries') is not null as is_available`,
    );

    if (!tableResult.rows[0]?.is_available) {
      return;
    }

    await db.query(
      `
        with school_clock as (
          select
            now() at time zone coalesce(
              nullif((select timezone from school_info where id = 1), ''),
              'Australia/Brisbane'
            ) as local_now
        )
        insert into notifications (
          recipient_user_id, type, title, message, action_target,
          entity_type, entity_id, dedupe_key, expires_at
        )
        select
          $1,
          'timetable.class_finished',
          'Class finished',
          'Record any promised credits or removals for ' || student_groups.name || '.',
          'Dashboard',
          'student_group',
          student_groups.id,
          'class-credit-reminder:' || timetable_entries.id::text || ':' ||
            school_clock.local_now::date::text,
          now() + interval '24 hours'
        from timetable_entries
        join student_groups on student_groups.id = timetable_entries.group_id
        cross join school_clock
        where timetable_entries.teacher_user_id = $1
          and timetable_entries.is_active = true
          and student_groups.is_active = true
          and timetable_entries.day_of_week = extract(dow from school_clock.local_now)::int
          and timetable_entries.end_time <= school_clock.local_now::time
        on conflict (recipient_user_id, dedupe_key)
          where dedupe_key is not null
        do nothing
      `,
      [userId],
    );
  }
}

async function insertNotification(
  client: PoolClient,
  input: {
    actionTarget: NotificationActionTarget;
    dedupeKey: string;
    entityId: string;
    entityType: string;
    message: string;
    recipientUserId: string;
    title: string;
    type: string;
  },
) {
  await client.query(
    `
      insert into notifications (
        recipient_user_id, type, title, message, action_target,
        entity_type, entity_id, dedupe_key
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (recipient_user_id, dedupe_key)
        where dedupe_key is not null
      do nothing
    `,
    [
      input.recipientUserId,
      input.type,
      input.title,
      input.message,
      input.actionTarget,
      input.entityType,
      input.entityId,
      input.dedupeKey,
    ],
  );
}

function formatRewardWorkMessage(counts: RewardWorkCounts) {
  return `${counts.pending_count} reward request${counts.pending_count === 1 ? "" : "s"} awaiting approval.`;
}

function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    actionTarget: row.action_target,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    isRead: row.read_at !== null,
    message: row.message,
    title: row.title,
    type: row.type,
  };
}
