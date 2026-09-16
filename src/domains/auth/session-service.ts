import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashServerSecret } from "@/lib/server-hash";
import type { Role, SessionUser } from "@/lib/session";

type SessionUserRow = {
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  profile_image_url: string;
  role: Role;
  username: string;
};

const sessionCookieName = "session_69";
const sessionTokenHashSecretEnv = "SESSION_TOKEN_HASH_SECRET";
const sessionTokenBytes = 32;
const sessionLengthDays = 7;
const idleSessionTimeoutHours = 8;
const hoursPerDay = 24;
const minutesPerHour = 60;
const secondsPerMinute = 60;
const millisecondsPerSecond = 1000;
const sessionLengthSeconds =
  sessionLengthDays * hoursPerDay * minutesPerHour * secondsPerMinute;
const sessionLengthMilliseconds =
  sessionLengthSeconds * millisecondsPerSecond;

export class SessionService {
  async createSession(userId: string) {
    const token = randomBytes(sessionTokenBytes).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLengthMilliseconds);

    await deleteExpiredOrIdleSessions();

    await db.query(
      `
        insert into user_sessions (user_id, token_hash, expires_at)
        values ($1, $2, $3)
      `,
      [userId, hashSessionToken(token), expiresAt],
    );

    const cookieStore = await cookies();

    cookieStore.set(sessionCookieName, token, {
      expires: expiresAt,
      httpOnly: true,
      maxAge: sessionLengthSeconds,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (!token) {
      return null;
    }

    try {
      const tokenHash = hashSessionToken(token);
      const result = await db.query<SessionUserRow>(
        `
          select
            users.id,
            users.email,
            users.username,
            users.first_name,
            users.last_name,
            users.profile_image_url,
            roles.role_key as role
          from user_sessions
          join users on users.id = user_sessions.user_id
          join roles on roles.id = users.role_id
          where user_sessions.token_hash = $1
            and user_sessions.expires_at > now()
            and user_sessions.last_seen_at > now() - ($2::int * interval '1 hour')
            and users.is_active = true
            and roles.is_active = true
          limit 1
        `,
        [tokenHash, idleSessionTimeoutHours],
      );
      const user = result.rows[0];

      if (!user) {
        await deleteSessionToken(tokenHash);
        return null;
      }

      await db.query(
        `
          update user_sessions
          set last_seen_at = now()
          where token_hash = $1
        `,
        [tokenHash],
      );

      return mapSessionUserRow(user);
    } catch (error) {
      console.error("Get current session failed", error);
      throw new Error("Could not verify the current session.", { cause: error });
    }
  }

  async clearSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (token) {
      try {
        await db.query(
          `
            delete from user_sessions
            where token_hash = $1
          `,
          [hashSessionToken(token)],
        );
      } catch (error) {
        console.error("Clear session failed", error);
      }
    }

    cookieStore.delete(sessionCookieName);
  }
}

async function deleteExpiredOrIdleSessions() {
  await db.query(`
    delete from user_sessions
    where expires_at <= now()
       or last_seen_at <= now() - ($1::int * interval '1 hour')
  `, [idleSessionTimeoutHours]);
}

async function deleteSessionToken(tokenHash: string) {
  await db.query(
    `
      delete from user_sessions
      where token_hash = $1
    `,
    [tokenHash],
  );
}

function hashSessionToken(token: string) {
  return hashServerSecret(token, sessionTokenHashSecretEnv);
}

function mapSessionUserRow(user: SessionUserRow): SessionUser {
  return {
    displayName: formatDisplayName(user.first_name, user.last_name),
    email: user.email,
    firstName: user.first_name,
    id: user.id,
    lastName: user.last_name,
    profileImageUrl: user.profile_image_url,
    role: user.role,
    username: user.username,
  };
}

function formatDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
