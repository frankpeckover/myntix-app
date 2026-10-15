"use server";

import { createHash } from "crypto";
import { AuthService } from "@/domains/auth/auth-service";
import { PasswordResetService } from "@/domains/auth/password-reset-service";
import type { CompletePasswordResetInput } from "@/domains/auth/password-reset-service";
import { sessionService } from "@/lib/actions/action-auth";
import { assertSameOriginRequest, getRequestOrigin } from "@/lib/security/origin";
import { checkRateLimit, consumeRateLimit } from "@/lib/security/rate-limit";
import { AuditService } from "@/domains/audit/audit-service";
import { normaliseLoginIdentifier, validateLoginInput } from "@/lib/auth/login-input";
import { getCurrentTenantSlug } from "@/lib/database/db";

const authService = new AuthService();
const auditService = new AuditService();
const passwordResetService = new PasswordResetService();
const loginRateLimitWindowMilliseconds = 5 * 60 * 1000;
const passwordResetRateLimitWindowMilliseconds = 15 * 60 * 1000;
const maxLoginAttemptsPerWindow = 8;
const maxFailedLoginAttemptsPerIpWindow = 200;
const maxPasswordResetAttemptsPerWindow = 5;
const maxPasswordResetAttemptsPerIpWindow = 30;

export async function loginUser(username: string, password: string) {
  try {
    await assertSameOriginRequest({ requireOrigin: true });
    const input = validateLoginInput(username, password);
    if (!input) return { ok: false as const, message: "Username or password is incorrect." };
    const tenant = await getCurrentTenantSlug();
    const ipLimitInput = {
      key: `login-failures:${tenant}`,
      maxAttempts: maxFailedLoginAttemptsPerIpWindow,
      windowMilliseconds: loginRateLimitWindowMilliseconds,
    };
    const ipLimit = await checkRateLimit(ipLimitInput);
    if (!ipLimit.ok) {
      return { ok: false as const, message: `Too many login attempts. Try again in ${ipLimit.retryAfterSeconds} seconds.` };
    }
    const accountLimit = await consumeRateLimit({
      includeIpAddress: false,
      key: `login-account:${tenant}:${hashIdentifier(input.username)}`,
      maxAttempts: maxLoginAttemptsPerWindow,
      windowMilliseconds: loginRateLimitWindowMilliseconds,
    });
    if (!accountLimit.ok) {
      return { ok: false as const, message: `Too many login attempts. Try again in ${accountLimit.retryAfterSeconds} seconds.` };
    }

    const result = await authService.login(input.username, input.password);
    if (result.ok) {
      await sessionService.createSession(result.user.id);
    } else {
      // Successful sign-ins do not exhaust a school's shared-IP allowance.
      await consumeRateLimit(ipLimitInput);
    }
    return result;
  } catch (error) {
    console.error("Sign-in request failed", error);
    return { ok: false as const, message: "Sign-in is temporarily unavailable. Please try again." };
  }
}

export async function logoutUser() {
  await assertSameOriginRequest();
  const currentUser = await sessionService.getCurrentUser();

  if (currentUser) {
    try {
      await auditService.log({
        action: "auth.logout",
        actorUserId: currentUser.id,
        details: { username: currentUser.username },
        entityId: currentUser.id,
        entityType: "auth",
      });
    } catch (error) {
      console.error("Logout audit log failed", error);
    }
  }

  await sessionService.clearSession();
}

export async function getCurrentSessionUser() {
  await assertSameOriginRequest();
  return sessionService.getCurrentUser();
}

export async function requestPasswordReset(identifier: string) {
  try {
    await assertSameOriginRequest({ requireOrigin: true });
    const normalizedIdentifier = normaliseLoginIdentifier(identifier);
    if (!normalizedIdentifier) return { ok: false as const, message: "Enter a valid username or email." };
    const tenant = await getCurrentTenantSlug();
    const ipLimit = await consumeRateLimit({
      key: `password-reset-ip:${tenant}`,
      maxAttempts: maxPasswordResetAttemptsPerIpWindow,
      windowMilliseconds: passwordResetRateLimitWindowMilliseconds,
    });
    const accountLimit = await consumeRateLimit({
      includeIpAddress: false,
      key: `password-reset-account:${tenant}:${hashIdentifier(normalizedIdentifier)}`,
      maxAttempts: maxPasswordResetAttemptsPerWindow,
      windowMilliseconds: passwordResetRateLimitWindowMilliseconds,
    });
    const rateLimit = !ipLimit.ok ? ipLimit : accountLimit;
    if (!rateLimit.ok) {
      return { ok: false as const, message: `Too many reset requests. Try again in ${rateLimit.retryAfterSeconds} seconds.` };
    }
    return passwordResetService.requestPasswordReset(normalizedIdentifier, await getRequestOrigin());
  } catch (error) {
    console.error("Password reset request failed", error);
    return { ok: false as const, message: "Could not request password reset. Please try again." };
  }
}

export async function completePasswordReset(input: CompletePasswordResetInput) {
  await assertSameOriginRequest();
  return passwordResetService.completePasswordReset(input);
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}
