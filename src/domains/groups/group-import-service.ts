import { db } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

export type ImportGroupMembershipInput = {
  description?: string;
  groupName: string;
  username: string;
};

export type ImportGroupsInput = {
  memberships: ImportGroupMembershipInput[];
};

export type ImportGroupsResult = {
  createdGroupCount: number;
  createdMembershipCount: number;
  errors: ImportGroupError[];
  ok: true;
};

export type ImportGroupError = {
  groupName: string;
  message: string;
  rowNumber: number;
  username: string;
};

type ImportGroupRow = {
  id: string;
  is_active: boolean;
};

type ImportUserRow = {
  id: string;
  is_active: boolean;
  role_key: string;
};

const auditService = new AuditService();

export class GroupImportService {
  async importGroups(
    currentUser: SessionUser,
    input: ImportGroupsInput,
  ): Promise<ImportGroupsResult> {
    const errors: ImportGroupError[] = [];
    let createdGroupCount = 0;
    let createdMembershipCount = 0;

    const client = await db.connect();

    try {
      await client.query("begin");

      for (const [index, membership] of input.memberships.entries()) {
        const rowNumber = index + 2;
        const description = membership.description?.trim() ?? "";
        const groupName = membership.groupName.trim();
        const username = membership.username.trim().toLowerCase();

        if (!groupName || !username) {
          errors.push(createImportError(rowNumber, groupName, username, "Group name and username are required."));
          continue;
        }

        const group = await upsertGroup(client, groupName, description);

        if (group.wasInserted) {
          createdGroupCount += 1;
        }

        if (!group.isActive) {
          errors.push(createImportError(rowNumber, groupName, username, "Group is archived."));
          continue;
        }

        const user = await findStudentUser(client, username);

        if (!user) {
          errors.push(createImportError(rowNumber, groupName, username, "User does not exist."));
          continue;
        }

        if (user.role_key !== "student") {
          errors.push(createImportError(rowNumber, groupName, username, "User is not a student."));
          continue;
        }

        if (!user.is_active) {
          errors.push(createImportError(rowNumber, groupName, username, "User is inactive."));
          continue;
        }

        const wasMembershipCreated = await addMembership(
          client,
          group.id,
          user.id,
        );

        if (wasMembershipCreated) {
          createdMembershipCount += 1;
        }
      }

      await auditService.logWithClient(client, {
        action: "student_group.imported",
        actorUserId: currentUser.id,
        details: {
          createdGroupCount,
          createdMembershipCount,
          errorCount: errors.length,
        },
        entityType: "student_group",
      });

      await client.query("commit");

      return {
        createdGroupCount,
        createdMembershipCount,
        errors,
        ok: true,
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Import groups failed", error);

      return {
        createdGroupCount,
        createdMembershipCount,
        errors: [
          ...errors,
          createImportError(0, "", "", "Could not import groups."),
        ],
        ok: true,
      };
    } finally {
      client.release();
    }
  }
}

async function upsertGroup(
  client: import("pg").PoolClient,
  groupName: string,
  description: string,
) {
  const groupResult = await client.query<
    ImportGroupRow & { was_inserted: boolean }
  >(
    `
      insert into student_groups (name, description)
      values ($1, $2)
      on conflict (name) do update
      set description = case
            when excluded.description <> '' then excluded.description
            else student_groups.description
          end,
          updated_at = now()
      returning id, is_active, xmax = 0 as was_inserted
    `,
    [groupName, description],
  );
  const group = groupResult.rows[0];

  return {
    id: group.id,
    isActive: group.is_active,
    wasInserted: group.was_inserted,
  };
}

async function findStudentUser(
  client: import("pg").PoolClient,
  username: string,
) {
  const userResult = await client.query<ImportUserRow>(
    `
      select users.id, roles.role_key, users.is_active
      from users
      join roles on roles.id = users.role_id
      where users.username = $1
    `,
    [username],
  );

  return userResult.rows[0] ?? null;
}

async function addMembership(
  client: import("pg").PoolClient,
  groupId: string,
  userId: string,
) {
  const membershipResult = await client.query(
    `
      insert into student_group_memberships (group_id, user_id)
      values ($1, $2)
      on conflict (group_id, user_id) do nothing
    `,
    [groupId, userId],
  );

  return (membershipResult.rowCount ?? 0) > 0;
}

function createImportError(
  rowNumber: number,
  groupName: string,
  username: string,
  message: string,
): ImportGroupError {
  return {
    groupName,
    message,
    rowNumber,
    username,
  };
}
