import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { decryptServerSecret, encryptServerSecret } from "@/lib/server-crypto";
import { hashPassword } from "@/lib/passwords";
import type { ActionResult } from "@/lib/action-results";
import type { SessionUser } from "@/lib/session";
import { AuditService } from "@/domains/audit/audit-service";
import type {
  DirectorySyncResult,
  DirectorySyncSnapshot,
  DirectorySyncStatus,
  DirectorySyncSummary,
  NormalisedDirectoryGroup,
  NormalisedDirectoryUser,
  NormalisedTimetableEntry,
  TassConnectionTestResult,
  TassSyncSettings,
  UpdateTassSyncSettingsInput,
} from "@/domains/integrations/directory-sync-types";
import {
  normaliseTassApiUrl,
  TassClient,
  TassClientError,
  type TassConnectionConfig,
} from "@/domains/integrations/tass-client";

type DirectorySyncSourceRow = {
  academic_year: number;
  api_version: 2 | 3;
  application_code: string;
  archive_missing_records: boolean;
  base_url: string;
  company_code: string;
  display_name: string;
  id: string;
  is_enabled: boolean;
  last_error: string;
  last_sync_completed_at: Date | null;
  last_sync_started_at: Date | null;
  last_sync_status: DirectorySyncStatus | null;
  last_sync_summary: DirectorySyncSummary | null;
  provider_type: "tass";
  semester: number;
  token_key_encrypted: string;
};

type LocalUserRow = {
  email: string;
  id: string;
  role: "admin" | "student" | "teacher";
  username: string;
};

type SyncContext = {
  client: PoolClient;
  sourceId: string;
  summary: DirectorySyncSummary;
};

const providerType = "tass";
const primaryAccountName = "Primary account";
const auditService = new AuditService();

export class DirectorySyncService {
  async getTassSettings(): Promise<TassSyncSettings> {
    const source = await this.getSource();
    return mapSettings(source);
  }

  async updateTassSettings(
    currentUser: SessionUser,
    input: UpdateTassSyncSettingsInput,
  ): Promise<ActionResult> {
    const displayName = input.displayName.trim() || "TASS";
    const baseUrl = input.baseUrl.trim();
    const companyCode = input.companyCode.trim();
    const applicationCode = input.applicationCode.trim();
    const tokenKey = input.tokenKey.trim();

    if (baseUrl) {
      try {
        normaliseTassApiUrl(baseUrl);
      } catch (error) {
        return { ok: false, message: getSyncErrorMessage(error, "Enter a valid TASS API URL.") };
      }
    }

    if (![2, 3].includes(input.apiVersion)) {
      return { ok: false, message: "Choose TASS API version 2 or 3." };
    }

    if (!Number.isInteger(input.academicYear) || input.academicYear < 2000 || input.academicYear > 2200) {
      return { ok: false, message: "Enter a valid academic year." };
    }

    if (!Number.isInteger(input.semester) || input.semester < 1 || input.semester > 4) {
      return { ok: false, message: "Semester must be between 1 and 4." };
    }

    const existing = await this.getSource();

    if (
      input.isEnabled &&
      (!baseUrl || !companyCode || !applicationCode || (!tokenKey && !existing.token_key_encrypted))
    ) {
      return {
        ok: false,
        message: "Complete the TASS URL, company code, application code, and token key before enabling sync.",
      };
    }

    const encryptedTokenKey = tokenKey
      ? encryptServerSecret(tokenKey)
      : existing.token_key_encrypted;
    const client = await db.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          update directory_sync_sources
          set display_name = $1,
              base_url = $2,
              company_code = $3,
              application_code = $4,
              token_key_encrypted = $5,
              api_version = $6,
              academic_year = $7,
              semester = $8,
              is_enabled = $9,
              archive_missing_records = $10,
              updated_at = now()
          where provider_type = $11
        `,
        [
          displayName,
          baseUrl,
          companyCode,
          applicationCode,
          encryptedTokenKey,
          input.apiVersion,
          input.academicYear,
          input.semester,
          input.isEnabled,
          input.archiveMissingRecords,
          providerType,
        ],
      );
      await auditService.logWithClient(client, {
        action: "directory_sync.settings_updated",
        actorUserId: currentUser.id,
        details: {
          academicYear: input.academicYear,
          apiVersion: input.apiVersion,
          archiveMissingRecords: input.archiveMissingRecords,
          hasTokenKey: Boolean(encryptedTokenKey),
          isEnabled: input.isEnabled,
          providerType,
          semester: input.semester,
        },
        entityId: existing.id,
        entityType: "directory_sync_source",
      });
      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Update directory sync settings failed", error);
      return { ok: false, message: "Could not save TASS sync settings." };
    } finally {
      client.release();
    }
  }

  async testTassConnection(): Promise<TassConnectionTestResult> {
    try {
      const source = await this.getSource();
      const client = new TassClient(getConnectionConfig(source));
      const result = await client.testConnection();
      return { ok: true, ...result };
    } catch (error) {
      return {
        ok: false,
        message: getSyncErrorMessage(error, "Could not connect to TASS."),
      };
    }
  }

  async runTassSync(currentUser: SessionUser): Promise<DirectorySyncResult> {
    const source = await this.getSource();

    if (!source.is_enabled) {
      return { ok: false, message: "Enable TASS sync before running it." };
    }

    const claimed = await db.query(
      `
        update directory_sync_sources
        set last_sync_started_at = now(),
            last_sync_status = 'running',
            last_error = '',
            updated_at = now()
        where id = $1
          and (
            last_sync_status is distinct from 'running'
            or last_sync_started_at < now() - interval '2 hours'
          )
        returning id
      `,
      [source.id],
    );

    if (claimed.rowCount === 0) {
      return { ok: false, message: "A TASS sync is already running." };
    }

    const run = await db.query<{ id: string }>(
      `
        insert into directory_sync_runs (source_id, started_by_user_id, status)
        values ($1, $2, 'running')
        returning id
      `,
      [source.id, currentUser.id],
    );
    const runId = run.rows[0].id;

    try {
      const tassClient = new TassClient(getConnectionConfig(source));
      const snapshot = await tassClient.fetchSnapshot();
      validateSnapshot(snapshot);
      const summary = await this.applySnapshot(
        source,
        snapshot,
        currentUser.id,
        runId,
      );
      return { ok: true, summary };
    } catch (error) {
      const message = getSyncErrorMessage(error, "TASS sync failed.");
      console.error("TASS directory sync failed", error);
      await markSyncFailed(source.id, runId, message);
      return { ok: false, message };
    }
  }

  async runScheduledTassSync(
    client: PoolClient,
    now = new Date(),
  ): Promise<"failed" | "skipped" | "succeeded"> {
    const source = await getSourceWithClient(client);

    if (!source?.is_enabled) {
      return "skipped";
    }

    const school = await client.query<{ timezone: string }>(
      "select timezone from school_info where id = 1 limit 1",
    );
    const timezone = school.rows[0]?.timezone?.trim() || "UTC";

    if (!isScheduledSyncDue(source, timezone, now)) {
      return "skipped";
    }

    const claimed = await claimSyncWithClient(client, source.id);

    if (!claimed) {
      return "skipped";
    }

    const run = await client.query<{ id: string }>(
      `
        insert into directory_sync_runs (source_id, status)
        values ($1, 'running')
        returning id
      `,
      [source.id],
    );
    const runId = run.rows[0].id;

    try {
      const tassClient = new TassClient(getConnectionConfig(source));
      const snapshot = await tassClient.fetchSnapshot();
      validateSnapshot(snapshot);
      await this.applySnapshotWithClient(client, source, snapshot, null, runId);
      return "succeeded";
    } catch (error) {
      const message = getSyncErrorMessage(error, "Scheduled TASS sync failed.");
      console.error("Scheduled TASS directory sync failed", error);
      await markSyncFailedWithClient(client, source.id, runId, message);
      return "failed";
    }
  }

  private async applySnapshot(
    source: DirectorySyncSourceRow,
    snapshot: DirectorySyncSnapshot,
    actorUserId: string | null,
    runId: string,
  ) {
    const client = await db.connect();

    try {
      return await this.applySnapshotWithClient(
        client,
        source,
        snapshot,
        actorUserId,
        runId,
      );
    } finally {
      client.release();
    }
  }

  private async applySnapshotWithClient(
    client: PoolClient,
    source: DirectorySyncSourceRow,
    snapshot: DirectorySyncSnapshot,
    actorUserId: string | null,
    runId: string,
  ) {
    const summary = createEmptySummary();
    const context: SyncContext = { client, sourceId: source.id, summary };

    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [
        `directory-sync:${source.id}`,
      ]);

      const userIds = await syncUsers(context, snapshot.users);
      const groupIds = await syncGroups(context, snapshot.groups);
      await syncMemberships(context, snapshot.groups, userIds, groupIds);
      await syncTimetable(context, snapshot.timetableEntries, userIds, groupIds);

      if (source.archive_missing_records) {
        await archiveMissingTimetable(context, snapshot.timetableEntries);
        await archiveMissingGroups(context, snapshot.groups);
        await archiveMissingUsers(context, snapshot.users);
      }

      await client.query(
        `
          update directory_sync_sources
          set last_sync_completed_at = now(),
              last_sync_status = 'succeeded',
              last_sync_summary = $1::jsonb,
              last_error = '',
              updated_at = now()
          where id = $2
        `,
        [JSON.stringify(summary), source.id],
      );
      await client.query(
        `
          update directory_sync_runs
          set status = 'succeeded', summary = $1::jsonb, completed_at = now()
          where id = $2
        `,
        [JSON.stringify(summary), runId],
      );
      await auditService.logWithClient(client, {
        action: "directory_sync.completed",
        actorUserId,
        details: { providerType, ...summary },
        entityId: source.id,
        entityType: "directory_sync_source",
      });
      await client.query("commit");
      return summary;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  private async getSource() {
    const result = await db.query<DirectorySyncSourceRow>(
      `
        select id, provider_type, display_name, base_url, company_code,
               application_code, token_key_encrypted, api_version,
               academic_year, semester, is_enabled, archive_missing_records,
               last_sync_started_at, last_sync_completed_at, last_sync_status,
               last_sync_summary, last_error
        from directory_sync_sources
        where provider_type = $1
        limit 1
      `,
      [providerType],
    );

    if (!result.rows[0]) {
      throw new Error("TASS sync is not installed for this organisation.");
    }

    return result.rows[0];
  }
}

async function syncUsers(context: SyncContext, users: NormalisedDirectoryUser[]) {
  const localIds = new Map<string, string>();

  for (const user of users) {
    const existing = await findMappedOrMatchingUser(context, user);

    if (existing?.role === "admin" && !existing.isMapped) {
      throw new Error(`TASS ${user.role} ${user.externalId} matches an administrator account. Resolve the email or username conflict before syncing.`);
    }

    let localUser: LocalUserRow;

    if (existing) {
      const result = await context.client.query<LocalUserRow>(
        `
          update users
          set role_id = case
                when $1 = 'admin' then role_id
                else (select id from roles where role_key = $2 and is_active = true)
              end,
              first_name = $3,
              preferred_name = $4,
              last_name = $5,
              email = $6,
              is_active = true,
              updated_at = now()
          where id = $7
          returning id, username, email,
                    (select role_key from roles where roles.id = users.role_id) as role
        `,
        [existing.role, user.role, normaliseName(user.firstName, user.role), normaliseName(user.preferredName), normaliseName(user.lastName, "User"), user.email, existing.id],
      );
      localUser = result.rows[0];
      context.summary.usersUpdated += 1;
    } else {
      const username = await getAvailableUsername(context.client, user);
      const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      const result = await context.client.query<LocalUserRow>(
        `
          insert into users (
            role_id, username, first_name, preferred_name, last_name,
            email, password_hash
          )
          values (
            (select id from roles where role_key = $1 and is_active = true),
            $2, $3, $4, $5, $6, $7
          )
          returning id, username, email,
                    (select role_key from roles where roles.id = users.role_id) as role
        `,
        [user.role, username, normaliseName(user.firstName, user.role), normaliseName(user.preferredName), normaliseName(user.lastName, "User"), user.email, passwordHash],
      );
      localUser = result.rows[0];
      context.summary.usersCreated += 1;
    }

    if (user.role === "student") {
      await context.client.query(
        `insert into accounts (user_id, account_name) values ($1, $2) on conflict (user_id) do nothing`,
        [localUser.id, primaryAccountName],
      );
    }

    await context.client.query(
      `
        delete from directory_sync_user_mappings
        where source_id = $1 and user_id = $2 and external_id <> $3
      `,
      [context.sourceId, localUser.id, user.externalId],
    );
    await context.client.query(
      `
        insert into directory_sync_user_mappings (
          source_id, external_id, user_id, external_role, last_seen_at
        )
        values ($1, $2, $3, $4, now())
        on conflict (source_id, external_id) do update
        set user_id = excluded.user_id,
            external_role = excluded.external_role,
            last_seen_at = now(),
            updated_at = now()
      `,
      [context.sourceId, user.externalId, localUser.id, user.role],
    );
    localIds.set(user.externalId, localUser.id);
  }

  return localIds;
}

async function findMappedOrMatchingUser(context: SyncContext, user: NormalisedDirectoryUser) {
  const mapped = await context.client.query<LocalUserRow>(
    `
      select users.id, users.username, users.email, roles.role_key as role
      from directory_sync_user_mappings
      join users on users.id = directory_sync_user_mappings.user_id
      join roles on roles.id = users.role_id
      where directory_sync_user_mappings.source_id = $1
        and directory_sync_user_mappings.external_id = $2
      limit 1
    `,
    [context.sourceId, user.externalId],
  );

  if (mapped.rows[0]) {
    return { ...mapped.rows[0], isMapped: true };
  }

  const sourceUsername = normaliseUsername(user.sourceUsername);
  const matched = await context.client.query<LocalUserRow>(
    `
      select users.id, users.username, users.email, roles.role_key as role
      from users
      join roles on roles.id = users.role_id
      where ($1 <> '' and lower(users.email) = $1)
         or ($2 <> '' and lower(users.username) = $2)
      order by case when $1 <> '' and lower(users.email) = $1 then 0 else 1 end
      limit 1
    `,
    [user.email, sourceUsername],
  );

  return matched.rows[0] ? { ...matched.rows[0], isMapped: false } : null;
}

async function syncGroups(context: SyncContext, groups: NormalisedDirectoryGroup[]) {
  const localIds = new Map<string, string>();

  for (const group of groups) {
    const mapped = await context.client.query<{ group_id: string }>(
      `select group_id from directory_sync_group_mappings where source_id = $1 and external_id = $2`,
      [context.sourceId, group.externalId],
    );
    let groupId = mapped.rows[0]?.group_id;

    if (groupId) {
      const name = await getAvailableGroupName(context.client, group.name, groupId);
      await context.client.query(
        `update student_groups set name = $1, description = $2, is_active = true, updated_at = now() where id = $3`,
        [name, group.description, groupId],
      );
      context.summary.groupsUpdated += 1;
    } else {
      const name = await getAvailableGroupName(context.client, group.name);
      const inserted = await context.client.query<{ id: string }>(
        `insert into student_groups (name, description) values ($1, $2) returning id`,
        [name, group.description],
      );
      groupId = inserted.rows[0].id;
      context.summary.groupsCreated += 1;
    }

    await context.client.query(
      `
        insert into directory_sync_group_mappings (source_id, external_id, group_id, last_seen_at)
        values ($1, $2, $3, now())
        on conflict (source_id, external_id) do update
        set group_id = excluded.group_id, last_seen_at = now(), updated_at = now()
      `,
      [context.sourceId, group.externalId, groupId],
    );
    localIds.set(group.externalId, groupId);
  }

  return localIds;
}

async function syncMemberships(
  context: SyncContext,
  groups: NormalisedDirectoryGroup[],
  userIds: Map<string, string>,
  groupIds: Map<string, string>,
) {
  for (const group of groups) {
    const groupId = groupIds.get(group.externalId);

    if (!groupId) continue;
    const desiredUserIds = group.studentExternalIds
      .map((externalId) => userIds.get(externalId))
      .filter((id): id is string => Boolean(id));
    const added = await context.client.query(
      `
        insert into student_group_memberships (group_id, user_id)
        select $1, desired.user_id
        from unnest($2::uuid[]) as desired(user_id)
        on conflict (group_id, user_id) do nothing
        returning id
      `,
      [groupId, desiredUserIds],
    );
    const removed = await context.client.query(
      `
        delete from student_group_memberships
        where group_id = $1
          and not (user_id = any($2::uuid[]))
        returning id
      `,
      [groupId, desiredUserIds],
    );
    context.summary.membershipsAdded += added.rowCount ?? 0;
    context.summary.membershipsRemoved += removed.rowCount ?? 0;
  }
}

async function syncTimetable(
  context: SyncContext,
  entries: NormalisedTimetableEntry[],
  userIds: Map<string, string>,
  groupIds: Map<string, string>,
) {
  for (const entry of entries) {
    const teacherUserId = userIds.get(entry.teacherExternalId);
    const groupId = groupIds.get(entry.groupExternalId);

    if (!teacherUserId || !groupId) continue;
    const mapped = await context.client.query<{ timetable_entry_id: string }>(
      `select timetable_entry_id from directory_sync_timetable_mappings where source_id = $1 and external_id = $2`,
      [context.sourceId, entry.externalId],
    );
    let timetableEntryId = mapped.rows[0]?.timetable_entry_id;

    if (timetableEntryId) {
      await context.client.query(
        `
          update timetable_entries
          set teacher_user_id = $1, group_id = $2, day_of_week = $3,
              start_time = $4, end_time = $5, is_active = true, updated_at = now()
          where id = $6
        `,
        [teacherUserId, groupId, entry.dayOfWeek, entry.startTime, entry.endTime, timetableEntryId],
      );
      context.summary.timetableUpdated += 1;
    } else {
      const identical = await context.client.query<{ id: string }>(
        `
          select id from timetable_entries
          where teacher_user_id = $1 and group_id = $2 and day_of_week = $3
            and start_time = $4 and end_time = $5 and is_active = true
          limit 1
        `,
        [teacherUserId, groupId, entry.dayOfWeek, entry.startTime, entry.endTime],
      );
      timetableEntryId = identical.rows[0]?.id;

      if (!timetableEntryId) {
        const inserted = await context.client.query<{ id: string }>(
          `
            insert into timetable_entries (
              teacher_user_id, group_id, day_of_week, start_time, end_time
            ) values ($1, $2, $3, $4, $5) returning id
          `,
          [teacherUserId, groupId, entry.dayOfWeek, entry.startTime, entry.endTime],
        );
        timetableEntryId = inserted.rows[0].id;
        context.summary.timetableCreated += 1;
      } else {
        context.summary.timetableUpdated += 1;
      }
    }

    await context.client.query(
      `
        insert into directory_sync_timetable_mappings (
          source_id, external_id, timetable_entry_id, last_seen_at
        ) values ($1, $2, $3, now())
        on conflict (source_id, external_id) do update
        set timetable_entry_id = excluded.timetable_entry_id,
            last_seen_at = now(), updated_at = now()
      `,
      [context.sourceId, entry.externalId, timetableEntryId],
    );
  }
}

async function archiveMissingUsers(context: SyncContext, users: NormalisedDirectoryUser[]) {
  const externalIds = users.map((user) => user.externalId);
  const archived = await context.client.query<{ user_id: string }>(
    `
      update users
      set is_active = false, updated_at = now()
      where id in (
        select mappings.user_id
        from directory_sync_user_mappings mappings
        join users mapped_users on mapped_users.id = mappings.user_id
        join roles on roles.id = mapped_users.role_id
        where mappings.source_id = $1
          and not (mappings.external_id = any($2::text[]))
          and roles.role_key <> 'admin'
      )
      and is_active = true
      returning id as user_id
    `,
    [context.sourceId, externalIds],
  );
  const archivedIds = archived.rows.map((row) => row.user_id);

  if (archivedIds.length > 0) {
    await context.client.query("delete from user_sessions where user_id = any($1::uuid[])", [archivedIds]);
  }
  context.summary.usersArchived += archivedIds.length;
}

async function archiveMissingGroups(context: SyncContext, groups: NormalisedDirectoryGroup[]) {
  const archived = await context.client.query(
    `
      update student_groups
      set is_active = false, updated_at = now()
      where id in (
        select group_id from directory_sync_group_mappings
        where source_id = $1 and not (external_id = any($2::text[]))
      ) and is_active = true
      returning id
    `,
    [context.sourceId, groups.map((group) => group.externalId)],
  );
  context.summary.groupsArchived += archived.rowCount ?? 0;
}

async function archiveMissingTimetable(context: SyncContext, entries: NormalisedTimetableEntry[]) {
  const archived = await context.client.query(
    `
      update timetable_entries
      set is_active = false, updated_at = now()
      where id in (
        select timetable_entry_id from directory_sync_timetable_mappings
        where source_id = $1 and not (external_id = any($2::text[]))
      ) and is_active = true
      returning id
    `,
    [context.sourceId, entries.map((entry) => entry.externalId)],
  );
  context.summary.timetableArchived += archived.rowCount ?? 0;
}

async function getAvailableUsername(client: PoolClient, user: NormalisedDirectoryUser) {
  const preferred = normaliseUsername(user.sourceUsername);
  const emailUsername = normaliseUsername(user.email.split("@")[0] ?? "");
  const nameUsername = [normaliseUsername(user.firstName), normaliseUsername(user.lastName)]
    .filter(Boolean)
    .join(".");
  const base = preferred || emailUsername || nameUsername || user.role;
  let suffix = 0;

  while (true) {
    const candidate = `${base}${suffix || ""}`;
    const existing = await client.query("select 1 from users where lower(username) = $1 limit 1", [candidate]);
    if (existing.rowCount === 0) return candidate;
    suffix += 1;
  }
}

async function getAvailableGroupName(client: PoolClient, value: string, currentGroupId?: string) {
  const base = value.trim() || "TASS class";
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? base : `${base} (${suffix + 1})`;
    const existing = await client.query(
      `select 1 from student_groups where lower(name) = lower($1) and ($2::uuid is null or id <> $2) limit 1`,
      [candidate, currentGroupId ?? null],
    );
    if (existing.rowCount === 0) return candidate;
    suffix += 1;
  }
}

async function markSyncFailed(sourceId: string, runId: string, message: string) {
  await db.query(
    `
      update directory_sync_sources
      set last_sync_completed_at = now(), last_sync_status = 'failed',
          last_error = $1, updated_at = now()
      where id = $2
    `,
    [message, sourceId],
  );
  await db.query(
    `update directory_sync_runs set status = 'failed', error_message = $1, completed_at = now() where id = $2`,
    [message, runId],
  );
}

async function markSyncFailedWithClient(
  client: PoolClient,
  sourceId: string,
  runId: string,
  message: string,
) {
  await client.query(
    `
      update directory_sync_sources
      set last_sync_completed_at = now(), last_sync_status = 'failed',
          last_error = $1, updated_at = now()
      where id = $2
    `,
    [message, sourceId],
  );
  await client.query(
    `update directory_sync_runs set status = 'failed', error_message = $1, completed_at = now() where id = $2`,
    [message, runId],
  );
}

async function getSourceWithClient(client: PoolClient) {
  const result = await client.query<DirectorySyncSourceRow>(
    `
      select id, provider_type, display_name, base_url, company_code,
             application_code, token_key_encrypted, api_version,
             academic_year, semester, is_enabled, archive_missing_records,
             last_sync_started_at, last_sync_completed_at, last_sync_status,
             last_sync_summary, last_error
      from directory_sync_sources
      where provider_type = $1
      limit 1
    `,
    [providerType],
  );
  return result.rows[0] ?? null;
}

async function claimSyncWithClient(client: PoolClient, sourceId: string) {
  const claimed = await client.query(
    `
      update directory_sync_sources
      set last_sync_started_at = now(),
          last_sync_status = 'running',
          last_error = '',
          updated_at = now()
      where id = $1
        and (
          last_sync_status is distinct from 'running'
          or last_sync_started_at < now() - interval '2 hours'
        )
      returning id
    `,
    [sourceId],
  );
  return (claimed.rowCount ?? 0) > 0;
}

function isScheduledSyncDue(
  source: DirectorySyncSourceRow,
  timezone: string,
  now: Date,
) {
  const localNow = getLocalDateParts(now, timezone);

  if (localNow.hour !== 0) {
    return false;
  }

  if (source.last_sync_status !== "succeeded" || !source.last_sync_completed_at) {
    return true;
  }

  const lastCompleted = getLocalDateParts(source.last_sync_completed_at, timezone);
  return lastCompleted.date !== localNow.date;
}

function getLocalDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function getConnectionConfig(source: DirectorySyncSourceRow): TassConnectionConfig {
  if (!source.base_url || !source.company_code || !source.application_code || !source.token_key_encrypted) {
    throw new Error("Complete and save the TASS connection settings first.");
  }

  return {
    academicYear: source.academic_year,
    apiVersion: source.api_version,
    applicationCode: source.application_code,
    baseUrl: source.base_url,
    companyCode: source.company_code,
    semester: source.semester,
    tokenKey: decryptServerSecret(source.token_key_encrypted),
  };
}

function mapSettings(source: DirectorySyncSourceRow): TassSyncSettings {
  return {
    academicYear: source.academic_year,
    apiVersion: source.api_version,
    applicationCode: source.application_code,
    archiveMissingRecords: source.archive_missing_records,
    baseUrl: source.base_url,
    companyCode: source.company_code,
    displayName: source.display_name,
    hasTokenKey: Boolean(source.token_key_encrypted),
    isEnabled: source.is_enabled,
    lastError: source.last_error,
    lastSyncCompletedAt: source.last_sync_completed_at?.toISOString() ?? null,
    lastSyncStartedAt: source.last_sync_started_at?.toISOString() ?? null,
    lastSyncStatus: source.last_sync_status,
    lastSyncSummary: source.last_sync_summary,
    providerType,
    semester: source.semester,
  };
}

function createEmptySummary(): DirectorySyncSummary {
  return {
    groupsArchived: 0,
    groupsCreated: 0,
    groupsUpdated: 0,
    membershipsAdded: 0,
    membershipsRemoved: 0,
    timetableArchived: 0,
    timetableCreated: 0,
    timetableUpdated: 0,
    usersArchived: 0,
    usersCreated: 0,
    usersUpdated: 0,
  };
}

function normaliseUsername(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
}

function normaliseName(value: string, fallback = "") {
  const trimmed = value.trim();
  if (!trimmed) return fallback.charAt(0).toUpperCase() + fallback.slice(1);
  return trimmed
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function getSyncErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TassClientError || error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function validateSnapshot(snapshot: DirectorySyncSnapshot) {
  if (snapshot.users.length === 0) {
    throw new Error(
      "TASS returned no current students or teachers. No local records were changed.",
    );
  }

  assertUnique(snapshot.users.map((user) => user.externalId), "user identifiers");
  assertUnique(snapshot.groups.map((group) => group.externalId), "class identifiers");
  assertUnique(
    snapshot.timetableEntries.map((entry) => entry.externalId),
    "timetable identifiers",
  );
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`TASS returned duplicate ${label}. No local records were changed.`);
  }
}
