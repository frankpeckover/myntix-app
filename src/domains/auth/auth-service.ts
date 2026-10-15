import { db } from "@/lib/database/db";
import { verifyPassword } from "@/lib/auth/passwords";
import { validateLoginInput } from "@/lib/auth/login-input";
import type { Role, SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

type UserRow = {
  email: string;
  id: string;
  username: string;
  first_name: string;
  preferred_name: string;
  last_name: string;
  profile_image_url: string;
  role: Role;
  password_hash: string;
};

const auditService = new AuditService();
const dummyPasswordHash = `scrypt:v1:${"00".repeat(16)}:${"00".repeat(64)}`;

export type LoginResult =
  | {
      ok: true;
      user: SessionUser;
    }
  | {
      ok: false;
      message: string;
    };

export class AuthService {
  async login(username: string, password: string): Promise<LoginResult> {
    const input = validateLoginInput(username, password);
    if (!input) {
      return {
        ok: false,
        message: "Username or password is incorrect.",
      };
    }

    try {
      const result = await db.query<UserRow>(
        `
          select
            users.id,
            users.email,
            users.username,
            users.first_name,
            users.preferred_name,
            users.last_name,
            users.profile_image_url,
            roles.role_key as role,
            users.password_hash
          from users
          join roles on roles.id = users.role_id
          where lower(username) = $1
            and users.is_active = true
            and roles.is_active = true
          limit 1
        `,
        [input.username],
      );

      const user = result.rows[0];

      // Unknown and disabled accounts still perform the expensive password comparison.
      const passwordMatches = await verifyPassword(input.password, user?.password_hash ?? dummyPasswordHash);
      if (!user || !passwordMatches) {
        await logAuthEvent({
          action: "auth.login_failed",
          details: { username: input.username },
        });

        return {
          ok: false,
          message: "Username or password is incorrect.",
        };
      }

      await logAuthEvent({
        action: "auth.login_success",
        actorUserId: user.id,
        details: { username: user.username },
        entityId: user.id,
      });

      return {
        ok: true,
        user: {
          email: user.email,
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          displayName: formatDisplayName(
            user.first_name,
            user.last_name,
            user.preferred_name,
          ),
          profileImageUrl: user.profile_image_url,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Database login failed", error);

      return {
        ok: false,
        message: "Sign-in is temporarily unavailable. Please try again.",
      };
    }
  }
}

async function logAuthEvent(input: {
  action: string;
  actorUserId?: string;
  details: Record<string, unknown>;
  entityId?: string;
}) {
  try {
    await auditService.log({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      details: input.details,
      entityId: input.entityId ?? null,
      entityType: "auth",
    });
  } catch (error) {
    console.error("Auth audit log failed", error);
  }
}

function formatDisplayName(firstName: string, lastName: string, preferredName = "") {
  return `${preferredName || firstName} ${lastName}`.trim();
}
