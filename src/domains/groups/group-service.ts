import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-results";

export type GroupListItem = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
};

export type GroupMemberItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  joinedAt: string;
};

export type UserGroupItem = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  joinedAt: string;
};

export type CreateGroupInput = {
  name: string;
  description: string;
};

export type UpdateGroupInput = CreateGroupInput & {
  id: string;
};

export type BulkGroupMembershipInput = {
  groupId: string;
  userIds: string[];
};

type GroupRow = {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_active: boolean;
  created_at: Date;
};

type GroupMemberRow = {
  id: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  username: string;
  joined_at: Date;
};

type UserGroupRow = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  joined_at: Date;
};

export class GroupService {
  async listGroups(includeInactive = false): Promise<GroupListItem[]> {
    const result = await db.query<GroupRow>(`
      select
        student_groups.id,
        student_groups.name,
        student_groups.description,
        student_groups.is_active,
        student_groups.created_at,
        count(student_group_memberships.id)::integer as member_count
      from student_groups
      left join student_group_memberships
        on student_group_memberships.group_id = student_groups.id
      where $1::boolean = true
        or student_groups.is_active = true
      group by student_groups.id
      order by student_groups.name
    `, [includeInactive]);

    return result.rows.map(mapGroupRow);
  }

  async listGroupMembers(groupId: string): Promise<GroupMemberItem[]> {
    if (!groupId) {
      return [];
    }

    const result = await db.query<GroupMemberRow>(
      `
        select
          users.id,
          users.first_name,
          users.preferred_name,
          users.last_name,
          users.username,
          student_group_memberships.created_at as joined_at
        from student_group_memberships
        join users on users.id = student_group_memberships.user_id
        where student_group_memberships.group_id = $1
        order by users.last_name, users.first_name
      `,
      [groupId],
    );

    return result.rows.map((member) => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      displayName: formatDisplayName(
        member.first_name,
        member.last_name,
        member.preferred_name,
      ),
      username: member.username,
      joinedAt: member.joined_at.toISOString(),
    }));
  }

  async listUserGroups(userId: string): Promise<UserGroupItem[]> {
    if (!userId) {
      return [];
    }

    const result = await db.query<UserGroupRow>(
      `
        select
          student_groups.id,
          student_groups.name,
          student_groups.description,
          student_groups.is_active,
          student_group_memberships.created_at as joined_at
        from student_group_memberships
        join student_groups
          on student_groups.id = student_group_memberships.group_id
        where student_group_memberships.user_id = $1
        order by student_groups.is_active desc, student_groups.name
      `,
      [userId],
    );

    return result.rows.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isActive: group.is_active,
      joinedAt: group.joined_at.toISOString(),
    }));
  }

  async createGroup(input: CreateGroupInput): Promise<ActionResult> {
    const name = input.name.trim();
    const description = input.description.trim();

    if (!name) {
      return {
        ok: false,
        message: "Enter a group name.",
      };
    }

    try {
      await db.query(
        `
          insert into student_groups (name, description)
          values ($1, $2)
        `,
        [name, description],
      );

      return { ok: true };
    } catch (error) {
      console.error("Create group failed", error);

      return {
        ok: false,
        message: getGroupErrorMessage(error),
      };
    }
  }

  async updateGroup(input: UpdateGroupInput): Promise<ActionResult> {
    const name = input.name.trim();
    const description = input.description.trim();

    if (!input.id) {
      return {
        ok: false,
        message: "Group was not found.",
      };
    }

    if (!name) {
      return {
        ok: false,
        message: "Enter a group name.",
      };
    }

    try {
      const result = await db.query(
        `
          update student_groups
          set name = $1,
              description = $2,
              updated_at = now()
          where id = $3
        `,
        [name, description, input.id],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "Group was not found.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Update group failed", error);

      return {
        ok: false,
        message: getGroupErrorMessage(error),
      };
    }
  }

  async addStudentToGroup(
    groupId: string,
    userId: string,
  ): Promise<ActionResult> {
    if (!groupId || !userId) {
      return {
        ok: false,
        message: "Select a group and student.",
      };
    }

    try {
      const result = await db.query(
        `
          insert into student_group_memberships (group_id, user_id)
          select $1, users.id
          from users
          join roles on roles.id = users.role_id
          where users.id = $2
            and roles.role_key = 'student'
            and users.is_active = true
          on conflict (group_id, user_id) do nothing
        `,
        [groupId, userId],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "Student is already in this group or could not be found.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Add student to group failed", error);

      return {
        ok: false,
        message: "Could not add student to group.",
      };
    }
  }

  async addStudentsToGroup(
    input: BulkGroupMembershipInput,
  ): Promise<ActionResult> {
    const userIds = getUniqueIds(input.userIds);

    if (!input.groupId || userIds.length === 0) {
      return {
        ok: false,
        message: "Select a group and at least one student.",
      };
    }

    try {
      await db.query(
        `
          insert into student_group_memberships (group_id, user_id)
          select $1, users.id
          from users
          join roles on roles.id = users.role_id
          where users.id = any($2::uuid[])
            and roles.role_key = 'student'
            and users.is_active = true
          on conflict (group_id, user_id) do nothing
        `,
        [input.groupId, userIds],
      );

      return { ok: true };
    } catch (error) {
      console.error("Add students to group failed", error);

      return {
        ok: false,
        message: "Could not add students to group.",
      };
    }
  }

  async removeStudentFromGroup(
    groupId: string,
    userId: string,
  ): Promise<ActionResult> {
    if (!groupId || !userId) {
      return {
        ok: false,
        message: "Select a group and student.",
      };
    }

    try {
      await db.query(
        `
          delete from student_group_memberships
          where group_id = $1
            and user_id = $2
        `,
        [groupId, userId],
      );

      return { ok: true };
    } catch (error) {
      console.error("Remove student from group failed", error);

      return {
        ok: false,
        message: "Could not remove student from group.",
      };
    }
  }

  async removeStudentsFromGroup(
    input: BulkGroupMembershipInput,
  ): Promise<ActionResult> {
    const userIds = getUniqueIds(input.userIds);

    if (!input.groupId || userIds.length === 0) {
      return {
        ok: false,
        message: "Select a group and at least one student.",
      };
    }

    try {
      await db.query(
        `
          delete from student_group_memberships
          where group_id = $1
            and user_id = any($2::uuid[])
        `,
        [input.groupId, userIds],
      );

      return { ok: true };
    } catch (error) {
      console.error("Remove students from group failed", error);

      return {
        ok: false,
        message: "Could not remove students from group.",
      };
    }
  }

  async setGroupActive(
    groupId: string,
    isActive: boolean,
  ): Promise<ActionResult> {
    if (!groupId) {
      return {
        ok: false,
        message: "Group was not found.",
      };
    }

    try {
      const result = await db.query(
        `
          update student_groups
          set is_active = $1,
              updated_at = now()
          where id = $2
        `,
        [isActive, groupId],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "Group was not found.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Set group active failed", error);

      return {
        ok: false,
        message: "Could not update group status.",
      };
    }
  }

}

function mapGroupRow(row: GroupRow): GroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    memberCount: row.member_count,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

function formatDisplayName(firstName: string, lastName: string, preferredName = "") {
  return `${preferredName || firstName} ${lastName}`.trim();
}

function getGroupErrorMessage(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : null;

  if (errorCode === "23505") {
    return "A group with this name already exists.";
  }

  return "Could not create group.";
}

function getUniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}
