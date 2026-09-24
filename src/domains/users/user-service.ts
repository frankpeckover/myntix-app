import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getDatabaseErrorMessage } from "@/lib/database-error-message";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/passwords";
import { validateNewPassword } from "@/lib/security/password-policy";
import type { ActionResult } from "@/lib/action-results";
import type { Role, SessionUser } from "@/lib/session";
import { AuditService } from "@/domains/audit/audit-service";
import { LedgerService } from "@/domains/ledger/ledger-service";

export type UserListItem = {
  id: string;
  username: string;
  firstName: string;
  preferredName: string;
  lastName: string;
  displayName: string;
  email: string;
  profileImageUrl: string;
  cardNumber: string;
  role: Role;
  isActive: boolean;
  lastActivityAt: string | null;
};

export type CreateUserInput = {
  username: string;
  firstName: string;
  preferredName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  cardNumber: string;
  role: Role;
  password: string;
};

export type ImportUserInput = Omit<
  CreateUserInput,
  "password" | "profileImageUrl"
>;

export type ImportUsersInput = {
  users: ImportUserInput[];
};

export type ImportUsersResult = {
  createdCount: number;
  createdUsers: ImportedUserCredential[];
  errors: ImportUserError[];
  ok: true;
};

export type ImportUsersPreviewResult = {
  duplicateCount: number;
  existingCount: number;
  invalidCount: number;
  newCount: number;
  rowCount: number;
};

export type ImportedUserCredential = {
  temporaryPassword: string;
  username: string;
};

export type ImportUserError = {
  message: string;
  rowNumber: number;
  username: string;
};

export type UpdateUserInput = {
  id: string;
  username: string;
  firstName: string;
  preferredName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  cardNumber: string;
  role: Role;
  isActive: boolean;
};

export type ResetUserPasswordInput = {
  id: string;
  password: string;
};

export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type CreateUserResult =
  | {
      ok: true;
      user: UserListItem;
    }
  | {
      ok: false;
      message: string;
    };

export type UserActionResult =
  | {
      ok: true;
      user: UserListItem;
    }
  | {
      ok: false;
      message: string;
    };

export type StudentListItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profileImageUrl: string;
  username: string;
};

type UserListRow = {
  id: string;
  username: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  email: string;
  profile_image_url: string;
  card_number: string;
  role: Role;
  is_active: boolean;
  last_activity_at: Date | null;
};

type StudentListRow = {
  id: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  profile_image_url: string;
  username: string;
};

type ImportableUser = {
  cardNumber: string;
  email: string;
  firstName: string;
  preferredName: string;
  lastName: string;
  passwordHash: string;
  role: Role;
  rowNumber: number;
  temporaryPassword: string;
  username: string;
};

type ImportedUserRow = {
  card_number: string;
  email: string;
  first_name: string;
  preferred_name: string;
  id: string;
  last_name: string;
  profile_image_url: string;
  role: Role;
  username: string;
};

const ledgerService = new LedgerService();
const auditService = new AuditService();
const defaultStudentSearchLimit = 12;
const primaryAccountName = "Primary account";
const profileImageUploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "users",
);
const profileImagePublicPath = "/uploads/users";
const bytesPerKilobyte = 1024;
const kilobytesPerMegabyte = 1024;
const maxProfileImageFileSizeMegabytes = 2;
const maxProfileImageFileSizeBytes =
  maxProfileImageFileSizeMegabytes * kilobytesPerMegabyte * bytesPerKilobyte;
const allowedProfileImageTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type UploadUserProfileImageResult =
  | {
      ok: true;
      imageUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export class UserService {
  async listUsers(): Promise<UserListItem[]> {
    const result = await db.query<UserListRow>(`
      select
        users.id,
        users.username,
        users.first_name,
        users.preferred_name,
        users.last_name,
        users.email,
        users.profile_image_url,
        users.card_number,
        roles.role_key as role,
        users.is_active,
        max(ledger_entries.created_at) as last_activity_at
      from users
      join roles on roles.id = users.role_id
      left join accounts on accounts.user_id = users.id
      left join ledger_entries on ledger_entries.account_id = accounts.id
      group by users.id, roles.role_key
      order by last_name, first_name
    `);

    return result.rows.map(this.mapUserListRow);
  }

  async listStudents(): Promise<StudentListItem[]> {
    return this.searchStudents("", defaultStudentSearchLimit);
  }

  async searchStudents(
    searchTerm: string,
    limit = defaultStudentSearchLimit,
  ): Promise<StudentListItem[]> {
    const normalizedSearchTerm = `%${searchTerm.trim().toLowerCase()}%`;
    const result = await db.query<StudentListRow>(`
      select
        users.id,
        users.first_name,
        users.preferred_name,
        users.last_name,
        users.profile_image_url,
        users.username
      from users
      join roles on roles.id = users.role_id
      where roles.role_key = 'student'
        and users.is_active = true
        and roles.is_active = true
        and (
          $1 = '%%'
          or lower(first_name) like $1
          or lower(preferred_name) like $1
          or lower(last_name) like $1
          or lower(username) like $1
          or lower(first_name || ' ' || last_name) like $1
        )
      order by last_name, first_name
      limit $2
    `, [normalizedSearchTerm, limit]);

    return result.rows.map((student) => ({
      id: student.id,
      firstName: student.first_name,
      preferredName: student.preferred_name,
      lastName: student.last_name,
      displayName: formatDisplayName(
        student.first_name,
        student.last_name,
        student.preferred_name,
      ),
      profileImageUrl: student.profile_image_url,
      username: student.username,
    }));
  }

  async createUser(
    input: CreateUserInput,
    currentUser?: SessionUser,
  ): Promise<CreateUserResult> {
    const username = input.username.trim().toLowerCase();
    const firstName = capitaliseName(input.firstName);
    const preferredName = capitaliseName(input.preferredName);
    const lastName = capitaliseName(input.lastName);
    const email = input.email.trim().toLowerCase();
    const profileImageUrl = input.profileImageUrl.trim();
    const cardNumber = input.cardNumber.trim();
    const password = input.password;

    if (!username || !firstName || !lastName || !password) {
      return {
        ok: false,
        message: "Complete all user fields.",
      };
    }

    const passwordPolicy = validateNewPassword(password);

    if (!passwordPolicy.ok) {
      return passwordPolicy;
    }

    const client = await db.connect();

    try {
      const passwordHash = await hashPassword(password);

      await client.query("begin");

      const result = await client.query<UserListRow>(
        `
          insert into users (
            role_id,
            username,
            first_name,
            preferred_name,
            last_name,
            email,
            profile_image_url,
            card_number,
            password_hash
          )
          values (
            (select id from roles where role_key = $1 and is_active = true),
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )
          returning
            id,
            username,
            first_name,
            preferred_name,
            last_name,
            profile_image_url,
            card_number,
            email,
            (select role_key from roles where roles.id = users.role_id) as role,
            is_active,
            null::timestamptz as last_activity_at
        `,
        [
          input.role,
          username,
          firstName,
          preferredName,
          lastName,
          email,
          profileImageUrl,
          cardNumber,
          passwordHash,
        ],
      );

      if (input.role === "student") {
        await ledgerService.ensureStudentAccount(client, result.rows[0].id);
      }

      await auditService.logWithClient(client, {
        action: "user.created",
        actorUserId: currentUser?.id,
        details: {
          role: input.role,
          username,
        },
        entityId: result.rows[0].id,
        entityType: "user",
      });

      await client.query("commit");

      return {
        ok: true,
        user: this.mapUserListRow(result.rows[0]),
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Create user failed", error);

      return {
        ok: false,
        message: getCreateUserErrorMessage(error),
      };
    } finally {
      client.release();
    }
  }

  async uploadProfileImage(file: File): Promise<UploadUserProfileImageResult> {
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Choose a profile image.",
      };
    }

    if (file.size > maxProfileImageFileSizeBytes) {
      return {
        ok: false,
        message: `Image must be ${maxProfileImageFileSizeMegabytes} MB or smaller.`,
      };
    }

    const extension = allowedProfileImageTypes.get(file.type);

    if (!extension) {
      return {
        ok: false,
        message: "Image must be a PNG, JPG, WebP, or GIF file.",
      };
    }

    try {
      await mkdir(profileImageUploadDirectory, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(profileImageUploadDirectory, fileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, fileBytes);

      return {
        ok: true,
        imageUrl: `${profileImagePublicPath}/${fileName}`,
      };
    } catch (error) {
      console.error("Upload user profile image failed", error);

      return {
        ok: false,
        message: "Could not upload profile image.",
      };
    }
  }

  async importUsers(
    input: ImportUsersInput,
    currentUser?: SessionUser,
  ): Promise<ImportUsersResult> {
    const errors: ImportUserError[] = [];
    const preparedUsers = await prepareImportUsers(input.users, errors);

    if (preparedUsers.length === 0) {
      return {
        createdCount: 0,
        createdUsers: [],
        errors,
        ok: true,
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const existingUsers = await client.query<{
        email: string;
        username: string;
      }>(
        `
          select username, email
          from users
          where username = any($1::text[])
             or (trim(email) <> '' and email = any($2::text[]))
        `,
        [
          preparedUsers.map((user) => user.username),
          preparedUsers.map((user) => user.email).filter(Boolean),
        ],
      );
      const existingUsernames = new Set(
        existingUsers.rows.map((user) => user.username),
      );
      const existingEmails = new Set(
        existingUsers.rows.map((user) => user.email),
      );
      const usersToCreate = preparedUsers.filter((user) => {
        if (
          existingUsernames.has(user.username) ||
          (Boolean(user.email) && existingEmails.has(user.email))
        ) {
          errors.push({
            message: "Username or email is already in use.",
            rowNumber: user.rowNumber,
            username: user.username,
          });
          return false;
        }

        return true;
      });

      if (usersToCreate.length === 0) {
        await client.query("commit");
        return {
          createdCount: 0,
          createdUsers: [],
          errors,
          ok: true,
        };
      }

      const insertedUsers = await client.query<ImportedUserRow>(
        `
          insert into users (
            role_id,
            username,
            first_name,
            preferred_name,
            last_name,
            email,
            profile_image_url,
            card_number,
            password_hash
          )
          select
            roles.id,
            imported.username,
            imported.first_name,
            imported.preferred_name,
            imported.last_name,
            imported.email,
            '',
            imported.card_number,
            imported.password_hash
          from jsonb_to_recordset($1::jsonb) as imported(
            card_number text,
            email text,
            first_name text,
            preferred_name text,
            last_name text,
            password_hash text,
            role text,
            username text
          )
          join roles on roles.role_key = imported.role
            and roles.is_active = true
          returning
            id,
            username,
            first_name,
            preferred_name,
            last_name,
            profile_image_url,
            card_number,
            email,
            (select role_key from roles where roles.id = users.role_id) as role
        `,
        [
          JSON.stringify(
            usersToCreate.map((user) => ({
              card_number: user.cardNumber,
              email: user.email,
              first_name: user.firstName,
              preferred_name: user.preferredName,
              last_name: user.lastName,
              password_hash: user.passwordHash,
              role: user.role,
              username: user.username,
            })),
          ),
        ],
      );

      await client.query(
        `
          insert into accounts (user_id, account_name)
          select users.id, $2
          from users
          join roles on roles.id = users.role_id
          where users.username = any($1::text[])
            and roles.role_key = 'student'
          on conflict (user_id) do nothing
        `,
        [insertedUsers.rows.map((user) => user.username), primaryAccountName],
      );

      await auditService.logWithClient(client, {
        action: "user.imported",
        actorUserId: currentUser?.id,
        details: {
          createdCount: insertedUsers.rows.length,
          usernames: insertedUsers.rows.map((user) => user.username),
        },
        entityType: "user",
      });

      await client.query("commit");

      const temporaryPasswordsByUsername = new Map(
        usersToCreate.map((user) => [user.username, user.temporaryPassword]),
      );
      const createdUsers = insertedUsers.rows.map((user) => ({
        temporaryPassword: temporaryPasswordsByUsername.get(user.username) ?? "",
        username: user.username,
      }));

      return {
        createdCount: createdUsers.length,
        createdUsers,
        errors,
        ok: true,
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Import users failed", error);

      return {
        createdCount: 0,
        createdUsers: [],
        errors: [
          ...errors,
          {
            message: getDatabaseErrorMessage(error, "Could not import users."),
            rowNumber: 0,
            username: "",
          },
        ],
        ok: true,
      };
    } finally {
      client.release();
    }
  }

  async previewImportUsers(
    input: ImportUsersInput,
  ): Promise<ImportUsersPreviewResult> {
    const previewRows = normaliseImportRows(input.users);
    const validRows = previewRows.filter((row) => row.isValid);

    if (validRows.length === 0) {
      return {
        duplicateCount: previewRows.filter((row) => row.isDuplicate).length,
        existingCount: 0,
        invalidCount: previewRows.filter(
          (row) => !row.isValid && !row.isDuplicate,
        ).length,
        newCount: 0,
        rowCount: previewRows.length,
      };
    }

    const existingUsers = await db.query<{
      email: string;
      username: string;
    }>(
      `
        select username, email
        from users
        where username = any($1::text[])
           or (trim(email) <> '' and email = any($2::text[]))
      `,
      [
        validRows.map((row) => row.username),
        validRows.map((row) => row.email).filter(Boolean),
      ],
    );
    const existingUsernames = new Set(
      existingUsers.rows.map((user) => user.username),
    );
    const existingEmails = new Set(
      existingUsers.rows.map((user) => user.email),
    );
    const existingCount = validRows.filter(
      (row) =>
        existingUsernames.has(row.username) ||
        (Boolean(row.email) && existingEmails.has(row.email)),
    ).length;
    const duplicateCount = previewRows.filter((row) => row.isDuplicate).length;
    const invalidCount = previewRows.filter(
      (row) => !row.isValid && !row.isDuplicate,
    ).length;

    return {
      duplicateCount,
      existingCount,
      invalidCount,
      newCount: Math.max(0, validRows.length - existingCount),
      rowCount: previewRows.length,
    };
  }

  async updateUser(
    input: UpdateUserInput,
    currentUser?: SessionUser,
  ): Promise<UserActionResult> {
    const username = input.username.trim().toLowerCase();
    const firstName = capitaliseName(input.firstName);
    const preferredName = capitaliseName(input.preferredName);
    const lastName = capitaliseName(input.lastName);
    const email = input.email.trim().toLowerCase();
    const profileImageUrl = input.profileImageUrl.trim();
    const cardNumber = input.cardNumber.trim();

    if (!input.id || !username || !firstName || !lastName) {
      return {
        ok: false,
        message: "Complete all user fields.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query<UserListRow>(
        `
          update users
          set username = $1,
              first_name = $2,
              preferred_name = $3,
              last_name = $4,
              email = $5,
              profile_image_url = $6,
              card_number = $7,
              role_id = (select id from roles where role_key = $8 and is_active = true),
              is_active = $9,
              updated_at = now()
          where id = $10
          returning
            id,
            username,
            first_name,
            preferred_name,
            last_name,
            profile_image_url,
            card_number,
            email,
            (select role_key from roles where roles.id = users.role_id) as role,
            is_active,
            (
              select max(ledger_entries.created_at)
              from accounts
              join ledger_entries on ledger_entries.account_id = accounts.id
              where accounts.user_id = users.id
            ) as last_activity_at
        `,
        [
          username,
          firstName,
          preferredName,
          lastName,
          email,
          profileImageUrl,
          cardNumber,
          input.role,
          input.isActive,
          input.id,
        ],
      );

      const user = result.rows[0];

      if (!user) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      if (user.role === "student") {
        await ledgerService.ensureStudentAccount(client, user.id);
      }

      let removedGroupMembershipCount = 0;

      if (!user.is_active || user.role !== "student") {
        removedGroupMembershipCount = await removeUserFromGroups(client, user.id);
      }

      if (!user.is_active) {
        await deleteUserSessions(client, user.id);
      }

      await auditService.logWithClient(client, {
        action: "user.updated",
        actorUserId: currentUser?.id,
        details: {
          email,
          isActive: input.isActive,
          removedGroupMembershipCount,
          role: input.role,
          username,
        },
        entityId: user.id,
        entityType: "user",
      });

      await client.query("commit");

      return {
        ok: true,
        user: this.mapUserListRow(user),
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Update user failed", error);

      return {
        ok: false,
        message: "Could not update user.",
      };
    } finally {
      client.release();
    }
  }

  async resetPassword(
    input: ResetUserPasswordInput,
    currentUser?: SessionUser,
  ): Promise<ActionResult> {
    if (!input.id || !input.password) {
      return {
        ok: false,
        message: "Enter a new password.",
      };
    }

    const passwordPolicy = validateNewPassword(input.password);

    if (!passwordPolicy.ok) {
      return passwordPolicy;
    }

    const client = await db.connect();

    try {
      const passwordHash = await hashPassword(input.password);
      await client.query("begin");

      const result = await client.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [passwordHash, input.id],
      );

      if (result.rowCount === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      await deleteUserSessions(client, input.id);

      await auditService.logWithClient(client, {
        action: "user.password_reset",
        actorUserId: currentUser?.id,
        entityId: input.id,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Reset password failed", error);

      return {
        ok: false,
        message: "Could not reset password.",
      };
    } finally {
      client.release();
    }
  }

  async changeOwnPassword(
    currentUser: SessionUser,
    input: ChangeOwnPasswordInput,
  ): Promise<ActionResult> {
    if (!input.currentPassword || !input.newPassword) {
      return {
        ok: false,
        message: "Enter your current password and a new password.",
      };
    }

    const passwordPolicy = validateNewPassword(input.newPassword);

    if (!passwordPolicy.ok) {
      return passwordPolicy;
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const currentPasswordResult = await client.query<{
        password_hash: string;
      }>(
        `
          select password_hash
          from users
          where id = $1
            and is_active = true
          for update
        `,
        [currentUser.id],
      );

      const passwordHash = currentPasswordResult.rows[0]?.password_hash;

      if (
        !passwordHash ||
        !(await verifyPassword(input.currentPassword, passwordHash))
      ) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Current password is incorrect.",
        };
      }

      const newPasswordHash = await hashPassword(input.newPassword);

      await client.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [newPasswordHash, currentUser.id],
      );
      await deleteUserSessions(client, currentUser.id);

      await auditService.logWithClient(client, {
        action: "user.password_changed",
        actorUserId: currentUser.id,
        entityId: currentUser.id,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Change own password failed", error);

      return {
        ok: false,
        message: "Could not change password.",
      };
    } finally {
      client.release();
    }
  }

  async setUserActive(
    userId: string,
    isActive: boolean,
    currentUser?: SessionUser,
  ): Promise<ActionResult> {
    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query(
        `
          update users
          set is_active = $1,
              updated_at = now()
          where id = $2
        `,
        [isActive, userId],
      );

      if (result.rowCount === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      const removedGroupMembershipCount = isActive
        ? 0
        : await removeUserFromGroups(client, userId);

      if (!isActive) {
        await deleteUserSessions(client, userId);
      }

      await auditService.logWithClient(client, {
        action: isActive ? "user.enabled" : "user.disabled",
        actorUserId: currentUser?.id,
        details: {
          removedGroupMembershipCount,
        },
        entityId: userId,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Set user active failed", error);

      return {
        ok: false,
        message: "Could not update user status.",
      };
    } finally {
      client.release();
    }
  }

  private mapUserListRow(user: UserListRow): UserListItem {
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      preferredName: user.preferred_name,
      lastName: user.last_name,
      displayName: formatDisplayName(
        user.first_name,
        user.last_name,
        user.preferred_name,
      ),
      email: user.email,
      profileImageUrl: user.profile_image_url,
      cardNumber: user.card_number,
      role: user.role,
      isActive: user.is_active,
      lastActivityAt: user.last_activity_at?.toISOString() ?? null,
    };
  }
}

function capitaliseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDisplayName(
  firstName: string,
  lastName: string,
  preferredName = "",
) {
  return `${preferredName || firstName} ${lastName}`.trim();
}

async function removeUserFromGroups(
  client: import("pg").PoolClient,
  userId: string,
) {
  const result = await client.query(
    `
      delete from student_group_memberships
      where user_id = $1
    `,
    [userId],
  );

  return result.rowCount ?? 0;
}

async function deleteUserSessions(
  client: import("pg").PoolClient,
  userId: string,
) {
  await client.query(
    `
      delete from user_sessions
      where user_id = $1
    `,
    [userId],
  );
}

async function prepareImportUsers(
  users: ImportUserInput[],
  errors: ImportUserError[],
) {
  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();
  const preparedUsers = await Promise.all(
    users.map(async (user, index): Promise<ImportableUser | null> => {
      const rowNumber = index + 2;
      const email = user.email.trim().toLowerCase();
      const cardNumber = user.cardNumber.trim();
      const firstName = capitaliseName(user.firstName);
      const preferredName = capitaliseName(user.preferredName);
      const lastName = capitaliseName(user.lastName);
      const temporaryPassword = generateTemporaryPassword();
      const username = user.username.trim().toLowerCase();

      if (!username || !firstName || !lastName) {
        errors.push({
          message: "Missing a required value.",
          rowNumber,
          username,
        });
        return null;
      }

      if (
        seenUsernames.has(username) ||
        (Boolean(email) && seenEmails.has(email))
      ) {
        errors.push({
          message: "Duplicate username or email in this CSV.",
          rowNumber,
          username,
        });
        return null;
      }

      seenUsernames.add(username);
      if (email) {
        seenEmails.add(email);
      }

      return {
        email,
        cardNumber,
        firstName,
        preferredName,
        lastName,
        passwordHash: await hashPassword(temporaryPassword),
        role: user.role,
        rowNumber,
        temporaryPassword,
        username,
      };
    }),
  );

  return preparedUsers.filter((user): user is ImportableUser => Boolean(user));
}

function normaliseImportRows(users: ImportUserInput[]) {
  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();

  return users.map((user, index) => {
    const email = user.email.trim().toLowerCase();
    const firstName = capitaliseName(user.firstName);
    const preferredName = capitaliseName(user.preferredName);
    const lastName = capitaliseName(user.lastName);
    const username = user.username.trim().toLowerCase();
    const isDuplicate =
      seenUsernames.has(username) ||
      (Boolean(email) && seenEmails.has(email));
    const isValid =
      Boolean(username) &&
      Boolean(firstName) &&
      Boolean(lastName) &&
      !isDuplicate;

    if (username) {
      seenUsernames.add(username);
    }

    if (email) {
      seenEmails.add(email);
    }

    return {
      email,
      preferredName,
      isDuplicate,
      isValid,
      rowNumber: index + 2,
      username,
    };
  });
}

function getCreateUserErrorMessage(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : null;

  if (errorCode === "23505") {
    return "Username or email is already in use.";
  }

  return getDatabaseErrorMessage(error, "Could not create user.");
}
