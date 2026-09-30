import { createHash, randomBytes } from "crypto";
import type { PoolClient } from "pg";
import type { ActionResult } from "@/lib/actions/action-results";
import { appConfig } from "@/lib/config/app-config";
import { db } from "@/lib/database/db";
import { hashPassword } from "@/lib/auth/passwords";
import { validateNewPassword } from "@/lib/security/password-policy";
import { AuditService } from "@/domains/audit/audit-service";
import { EmailService } from "@/domains/integrations/email-service";
import { buildPasswordResetEmail } from "@/domains/integrations/email-templates/password-reset-email";
import { SchoolService } from "@/domains/organisation/school-service";

type PasswordResetUserRow = {
  email: string;
  first_name: string;
  id: string;
  username: string;
};

type PasswordResetTokenRow = {
  user_id: string;
};

export type CompletePasswordResetInput = {
  newPassword: string;
  token: string;
};

export type PasswordResetRequestResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

const auditService = new AuditService();
const emailService = new EmailService();
const schoolService = new SchoolService();
const resetTokenBytes = 32;
const resetTokenExpiryMinutes = 60;
const millisecondsPerMinute = 60_000;
const genericResetMessage =
  "If that account exists, a password reset email has been sent.";

export class PasswordResetService {
  async requestPasswordReset(
    identifier: string,
    requestOrigin: string,
  ): Promise<PasswordResetRequestResult> {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (!normalizedIdentifier) {
      return {
        ok: false,
        message: "Enter your username or email.",
      };
    }

    try {
      const user = await findActiveUser(normalizedIdentifier);

      if (!user) {
        return {
          ok: true,
          message: genericResetMessage,
        };
      }

      const token = randomBytes(resetTokenBytes).toString("base64url");
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(
        Date.now() + resetTokenExpiryMinutes * millisecondsPerMinute,
      );
      const resetUrl = buildResetUrl(token, requestOrigin);

      const client = await db.connect();

      try {
        await client.query("begin");
        await expireExistingTokens(client, user.id);
        await client.query(
          `
            insert into password_reset_tokens (user_id, token_hash, expires_at)
            values ($1, $2, $3)
          `,
          [user.id, tokenHash, expiresAt],
        );
        await auditService.logWithClient(client, {
          action: "user.password_reset_requested",
          actorUserId: user.id,
          entityId: user.id,
          entityType: "user",
        });
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }

      const schoolInfo = await schoolService.getSchoolInfo();
      const email = buildPasswordResetEmail({
        appName: appConfig.name,
        appOrigin: requestOrigin,
        appLockupUrl: appConfig.lockupUrl,
        expiresInMinutes: resetTokenExpiryMinutes,
        firstName: user.first_name,
        resetUrl,
        schoolLogoUrl: schoolInfo.logoUrl,
        schoolName: schoolInfo.name,
        supportEmail: appConfig.supportEmail,
      });
      const emailResult = await emailService.sendEmail({
        html: email.html,
        subject: email.subject,
        text: email.text,
        to: user.email,
      });

      if (!emailResult.ok) {
        console.error("Password reset email delivery failed", {
          userId: user.id,
        });
        await db.query(
          `
            update password_reset_tokens
            set used_at = now()
            where token_hash = $1
              and used_at is null
          `,
          [tokenHash],
        );
      }

      return {
        ok: true,
        message: genericResetMessage,
      };
    } catch (error) {
      console.error("Request password reset failed", error);

      return {
        ok: false,
        message: "Could not request password reset.",
      };
    }
  }

  async completePasswordReset(
    input: CompletePasswordResetInput,
  ): Promise<ActionResult> {
    const token = input.token.trim();
    const newPassword = input.newPassword;

    if (!token || !newPassword) {
      return {
        ok: false,
        message: "Enter a new password.",
      };
    }

    const passwordPolicy = validateNewPassword(newPassword);

    if (!passwordPolicy.ok) {
      return passwordPolicy;
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const tokenResult = await client.query<PasswordResetTokenRow>(
        `
          select user_id
          from password_reset_tokens
          where token_hash = $1
            and used_at is null
            and expires_at > now()
          for update
        `,
        [hashResetToken(token)],
      );
      const resetToken = tokenResult.rows[0];

      if (!resetToken) {
        await client.query("rollback");
        return {
          ok: false,
          message: "This reset link is invalid or has expired.",
        };
      }

      const passwordHash = await hashPassword(newPassword);

      await client.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [passwordHash, resetToken.user_id],
      );
      await deleteUserSessions(client, resetToken.user_id);
      await client.query(
        `
          update password_reset_tokens
          set used_at = now()
          where token_hash = $1
        `,
        [hashResetToken(token)],
      );
      await auditService.logWithClient(client, {
        action: "user.password_reset_completed",
        actorUserId: resetToken.user_id,
        entityId: resetToken.user_id,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Complete password reset failed", error);

      return {
        ok: false,
        message: "Could not reset password.",
      };
    } finally {
      client.release();
    }
  }
}

async function findActiveUser(identifier: string) {
  const result = await db.query<PasswordResetUserRow>(
    `
      select id, username, first_name, email
      from users
      where is_active = true
        and (lower(username) = $1 or lower(email) = $1)
      limit 1
    `,
    [identifier],
  );

  return result.rows[0] ?? null;
}

async function expireExistingTokens(client: PoolClient, userId: string) {
  await client.query(
    `
      update password_reset_tokens
      set used_at = now()
      where user_id = $1
        and used_at is null
    `,
    [userId],
  );
}

async function deleteUserSessions(client: PoolClient, userId: string) {
  await client.query(
    `
      delete from user_sessions
      where user_id = $1
    `,
    [userId],
  );
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string, requestOrigin: string) {
  const resetUrl = new URL("/reset-password", requestOrigin);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
}
