import { NextResponse } from "next/server";
import { setSsoStateCookie } from "@/lib/auth/sso-state-cookie";
import type { SsoProviderType } from "@/lib/auth/sso-types";
import { SsoAuthService } from "@/domains/auth/sso-auth-service";

type SsoStartContext = {
  params: Promise<{
    provider: string;
  }>;
};

const ssoAuthService = new SsoAuthService();
const noStoreHeader = "no-store";

export const runtime = "nodejs";

export async function GET(request: Request, context: SsoStartContext) {
  const { provider } = await context.params;
  const providerType = normalizeProviderType(provider);

  if (!providerType) {
    return redirectToLogin(request, "sso_error");
  }

  const ssoProvider = await ssoAuthService.getProviderForAuth(providerType);

  if (!ssoProvider) {
    return redirectToLogin(request, "sso_unavailable");
  }

  const requestOrigin = getRequestOrigin(request);
  const state = ssoAuthService.createState(providerType, requestOrigin);
  const redirectUri = getCallbackUrl(requestOrigin, providerType);

  await setSsoStateCookie(state);

  return redirectNoStore(
    ssoAuthService.buildAuthorizationUrl(ssoProvider, redirectUri, state),
  );
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
