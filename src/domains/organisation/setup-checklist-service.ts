import { db } from "@/lib/database/db";

export type SetupChecklistTarget =
  | "Credit Management"
  | "Groups"
  | "Preferences"
  | "Rewards"
  | "Settings"
  | "Timetable"
  | "Users";

export type SetupChecklistStepKey =
  | "organisation"
  | "currency"
  | "authentication"
  | "staff"
  | "students"
  | "groups"
  | "timetable"
  | "rewards"
  | "notifications"
  | "integrations"
  | "final_check";

export type SetupChecklistItem = {
  description: string;
  isComplete: boolean;
  key: SetupChecklistStepKey;
  manualActionLabel: string | null;
  target: SetupChecklistTarget;
  title: string;
};

export type SetupChecklistSummary = {
  completedCount: number;
  isDismissed: boolean;
  items: SetupChecklistItem[];
  totalCount: number;
};

type SetupStateRow = {
  active_api_clients: number;
  active_groups: number;
  active_reward_items: number;
  active_staff: number;
  active_students: number;
  active_timetable_entries: number;
  amount_presets: number;
  completed_step_keys: string[] | null;
  contact_email: string;
  currency_name: string;
  dismissed_at: Date | null;
  enabled_sso_providers: number;
  group_memberships: number;
  has_ledger_activity: boolean;
  has_notification_preferences: boolean;
  logo_url: string;
  organisation_name: string;
  reason_presets: number;
  student_accounts: number;
  timezone: string;
};

export const setupChecklistStepKeys: readonly SetupChecklistStepKey[] = [
  "organisation",
  "currency",
  "authentication",
  "staff",
  "students",
  "groups",
  "timetable",
  "rewards",
  "notifications",
  "integrations",
  "final_check",
];

export class SetupChecklistService {
  async getSummary(userId: string): Promise<SetupChecklistSummary> {
    const result = await db.query<SetupStateRow>(
      `
        select
          school_info.name as organisation_name,
          school_info.contact_email,
          school_info.timezone,
          school_info.logo_url,
          school_info.currency_name,
          coalesce(preferences.dismissed_at, null) as dismissed_at,
          coalesce(preferences.completed_step_keys, '{}') as completed_step_keys,
          (select count(*)::int from transaction_presets where preset_type = 'amount' and is_active = true) as amount_presets,
          (select count(*)::int from transaction_presets where preset_type = 'reason' and is_active = true) as reason_presets,
          (select count(*)::int from users join roles on roles.id = users.role_id where users.is_active = true and roles.role_key = 'teacher') as active_staff,
          (select count(*)::int from users join roles on roles.id = users.role_id where users.is_active = true and roles.role_key = 'student') as active_students,
          (select count(*)::int from accounts where is_active = true) as student_accounts,
          (select count(*)::int from student_groups where is_active = true) as active_groups,
          (select count(*)::int from student_group_memberships) as group_memberships,
          (select count(*)::int from timetable_entries where is_active = true) as active_timetable_entries,
          (select count(*)::int from shop_items where is_active = true) as active_reward_items,
          (select count(*)::int from sso_identity_providers where is_enabled = true) as enabled_sso_providers,
          (select count(*)::int from api_clients where is_active = true) as active_api_clients,
          exists(select 1 from notification_preferences where user_id = $1) as has_notification_preferences,
          exists(select 1 from ledger_entries where status = 'posted' and is_voided = false) as has_ledger_activity
        from school_info
        left join admin_setup_checklist_preferences preferences
          on preferences.user_id = $1
        where school_info.id = 1
      `,
      [userId],
    );
    const state = result.rows[0];

    if (!state) {
      throw new Error("Organisation settings are unavailable.");
    }

    const manuallyCompleted = new Set(state.completed_step_keys ?? []);
    const items: SetupChecklistItem[] = [
      createItem({
        description: "Add the school name, contact details, timezone and logo.",
        isComplete: Boolean(
          state.organisation_name.trim() &&
            state.contact_email.trim() &&
            state.timezone.trim() &&
            state.logo_url.trim(),
        ),
        key: "organisation",
        target: "Settings",
        title: "Organisation details",
      }),
      createItem({
        description: "Confirm the currency name and default quick actions.",
        isComplete: Boolean(
          state.currency_name.trim() &&
            state.amount_presets > 0 &&
            state.reason_presets > 0,
        ),
        key: "currency",
        target: "Settings",
        title: "Currency defaults",
      }),
      createItem({
        description: "Review local sign-in, SSO domains and optional JIT creation.",
        isComplete:
          state.enabled_sso_providers > 0 || manuallyCompleted.has("authentication"),
        key: "authentication",
        manualActionLabel: "Mark reviewed",
        target: "Settings",
        title: "Authentication",
      }),
      createItem({
        description: "Create or import the staff who will use Myntix.",
        isComplete: state.active_staff > 0,
        key: "staff",
        target: "Users",
        title: "Staff accounts",
      }),
      createItem({
        description: "Import students and confirm their primary accounts.",
        isComplete:
          state.active_students > 0 && state.student_accounts >= state.active_students,
        key: "students",
        target: "Users",
        title: "Students",
      }),
      createItem({
        description: "Create groups and assign at least one student.",
        isComplete: state.active_groups > 0 && state.group_memberships > 0,
        key: "groups",
        target: "Groups",
        title: "Groups",
      }),
      createItem({
        description: "Assign teachers and groups to the weekly timetable.",
        isComplete: state.active_timetable_entries > 0,
        key: "timetable",
        target: "Timetable",
        title: "Timetable",
      }),
      createItem({
        description: "Add rewards, or skip this step if rewards are not being used.",
        isComplete:
          state.active_reward_items > 0 || manuallyCompleted.has("rewards"),
        key: "rewards",
        manualActionLabel: "Skip",
        target: "Rewards",
        title: "Rewards catalogue",
      }),
      createItem({
        description: "Choose how reward request reminders should reach you.",
        isComplete:
          state.has_notification_preferences || manuallyCompleted.has("notifications"),
        key: "notifications",
        manualActionLabel: "Mark reviewed",
        target: "Preferences",
        title: "Notifications",
      }),
      createItem({
        description: "Create an API key, or skip this optional integration step.",
        isComplete:
          state.active_api_clients > 0 || manuallyCompleted.has("integrations"),
        key: "integrations",
        manualActionLabel: "Skip",
        target: "Settings",
        title: "API integrations",
      }),
      createItem({
        description: "Test one credit transaction before staff begin using the system.",
        isComplete: state.has_ledger_activity,
        key: "final_check",
        target: "Credit Management",
        title: "Final workflow check",
      }),
    ];

    return {
      completedCount: items.filter((item) => item.isComplete).length,
      isDismissed: state.dismissed_at !== null,
      items,
      totalCount: items.length,
    };
  }

  async setDismissed(userId: string, isDismissed: boolean) {
    await db.query(
      `
        insert into admin_setup_checklist_preferences (user_id, dismissed_at)
        values ($1, case when $2::boolean then now() else null end)
        on conflict (user_id) do update
        set dismissed_at = excluded.dismissed_at,
            updated_at = now()
      `,
      [userId, isDismissed],
    );
  }

  async completeStep(userId: string, stepKey: SetupChecklistStepKey) {
    if (!setupChecklistStepKeys.includes(stepKey)) {
      throw new Error("Unknown setup checklist step.");
    }

    await db.query(
      `
        insert into admin_setup_checklist_preferences (
          user_id, completed_step_keys
        )
        values ($1, array[$2::text])
        on conflict (user_id) do update
        set completed_step_keys = case
              when $2 = any(admin_setup_checklist_preferences.completed_step_keys)
                then admin_setup_checklist_preferences.completed_step_keys
              else array_append(admin_setup_checklist_preferences.completed_step_keys, $2)
            end,
            updated_at = now()
      `,
      [userId, stepKey],
    );
  }
}

function createItem(
  item: Omit<SetupChecklistItem, "manualActionLabel"> & {
    manualActionLabel?: string;
  },
): SetupChecklistItem {
  return {
    ...item,
    manualActionLabel: item.manualActionLabel ?? null,
  };
}
