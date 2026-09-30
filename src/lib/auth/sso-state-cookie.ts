import { cookies } from "next/headers";
import { decryptServerSecret, encryptServerSecret } from "@/lib/security/server-crypto";
import type { SsoState } from "@/domains/auth/sso-auth-service";

const ssoStateCookieName = "app_sso_state";
const ssoStateMaxAgeSeconds = 10 * 60;
const millisecondsPerSecond = 1000;

export async function setSsoStateCookie(state: SsoState) {
  const cookieStore = await cookies();

  cookieStore.set(ssoStateCookieName, encryptServerSecret(JSON.stringify(state)), {
    httpOnly: true,
    maxAge: ssoStateMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSsoStateCookie() {
  const cookieStore = await cookies();
  const encryptedState = cookieStore.get(ssoStateCookieName)?.value;

  if (!encryptedState) {
    return null;
  }

  try {
    const state = JSON.parse(decryptServerSecret(encryptedState)) as SsoState;

    if (!isFreshState(state)) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export async function clearSsoStateCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ssoStateCookieName);
}

function isFreshState(state: SsoState) {
  if (!Number.isInteger(state.createdAt)) {
    return false;
  }

  return (
    Date.now() - state.createdAt <=
    ssoStateMaxAgeSeconds * millisecondsPerSecond
  );
}
