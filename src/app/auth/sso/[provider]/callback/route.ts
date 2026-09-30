import { NextResponse } from "next/server";
import {
  clearSsoStateCookie,
  getSsoStateCookie,
} from "@/lib/auth/sso-state-cookie";
import type { SsoProviderType } from "@/lib/auth/sso-types";
import { SessionService } from "@/domains/auth/session-service";
import { SsoAuthError, SsoAuthService } from "@/domains/auth/sso-auth-service";
import { ErrorLogService } from "@/domains/audit/error-log-service";

type SsoCallbackContext = {
  params: Promise<{
    provider: string;
  }>;
};

const sessionService = new SessionService();
const ssoAuthService = new SsoAuthService();
const errorLogService = new ErrorLogService();
const maxCallbackValueLength = 4096;
const noStoreHeader = "no-store";

export const runtime = "nodejs";

export async function GET(request: Request, context: SsoCallbackContext) {
  const { provider } = await context.params;
  const providerType = normalizeProviderType(provider);
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code") ?? "";
  const returnedState = requestUrl.searchParams.get("state") ?? "";
  const storedState = await getSsoStateCookie();
  const requestOrigin = getRequestOrigin(request);

  await clearSsoStateCookie();

  if (!providerType) {
    return redirectToLogin(request, "unknown_provider");
  }

  if (error) {
    await logSsoCallbackError(request, new Error(error), {
      providerType,
      source: "provider_error",
    });
    return redirectToLogin(request, "provider_error");
  }

  if (!code || !returnedState) {
    return redirectToLogin(request, "missing_callback_values");
  }

  if (
    code.length > maxCallbackValueLength ||
    returnedState.length > maxCallbackValueLength
  ) {
    return redirectToLogin(request, "invalid_callback_values");
  }

  if (
    !storedState ||
    storedState.providerType !== providerType ||
    storedState.state !== returnedState ||
    storedState.redirectOrigin !== requestOrigin
  ) {
    return redirectToLogin(request, "state_mismatch");
  }

  const ssoProvider = await ssoAuthService.getProviderForAuth(providerType);

  if (!ssoProvider) {
    return redirectToLogin(request, "sso_unavailable");
  }

  try {
    const result = await ssoAuthService.completeSignIn({
      code,
      provider: ssoProvider,
      redirectUri: getCallbackUrl(requestOrigin, providerType),
      state: storedState,
    });

    if (!result.ok) {
      return redirectToLogin(request, result.reason);
    }

    await sessionService.createSession(result.user.id);

    return redirectNoStore(new URL("/", request.url));
  } catch (callbackError) {
    if (callbackError instanceof SsoAuthError) {
      console.error("SSO callback failed", callbackError.message);
      await logSsoCallbackError(request, callbackError, {
        errorCode: callbackError.code,
        providerType,
      });
      return redirectToLogin(request, callbackError.code);
    } else {
      console.error("SSO callback failed", callbackError);
      await logSsoCallbackError(request, callbackError, {
        providerType,
      });
    }

    return redirectToLogin(request, "sso_error");
  }
}

function normalizeProviderType(provider: string): SsoProviderType | null {
  if (provider === "google" || provider === "microsoft_entra") {
    return provider;
  }

  return null;
}

function getCallbackUrl(requestOrigin: string, providerType: SsoProviderType) {
  return new URL(`/auth/sso/${providerType}/callback`, requestOrigin).toString();
}

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0];
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];

  return `${forwardedProto || url.protocol.replace(":", "")}://${forwardedHost || url.host}`;
}

function redirectToLogin(request: Request, status: string) {
  return redirectNoStore(new URL(`/?sso=${status}`, request.url));
}

function redirectNoStore(url: string | URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("cache-control", noStoreHeader);

  return response;
}

async function logSsoCallbackError(
  request: Request,
  error: unknown,
  context: Record<string, unknown>,
) {
  await errorLogService.log({
    context: {
      ...context,
      callbackUrl: stripSearchParams(request.url),
    },
    error,
    source: "SsoCallback",
  });
}

function stripSearchParams(url: string) {
  const parsedUrl = new URL(url);
  parsedUrl.search = "";

  return parsedUrl.toString();
}
