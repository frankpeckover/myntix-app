import { NextResponse, type NextRequest } from "next/server";

const httpsProtocol = "https";
const disabledFlag = "true";
const strictTransportSecurityValue = "max-age=31536000; includeSubDomains";
const contentSecurityPolicyValue = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https://fonts.gstatic.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "upgrade-insecure-requests",
].join("; ");

export function proxy(request: NextRequest) {
  const protocol = getRequestProtocol(request);

  if (!shouldEnforceHttps()) {
    return withSecurityHeaders(NextResponse.next(), protocol);
  }

  if (protocol === httpsProtocol) {
    return withSecurityHeaders(NextResponse.next(), protocol);
  }

  const url = request.nextUrl.clone();
  url.protocol = `${httpsProtocol}:`;
  const forwardedHost = getForwardedHost(request);

  if (forwardedHost) {
    url.host = forwardedHost;
  }

  return withSecurityHeaders(NextResponse.redirect(url, 308), httpsProtocol);
}

function shouldEnforceHttps() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_HTTPS_REDIRECT !== disabledFlag
  );
}

function getRequestProtocol(request: NextRequest) {
  return (
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase() || request.nextUrl.protocol.replace(":", "")
  );
}

function getForwardedHost(request: NextRequest) {
  return request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
}

function withSecurityHeaders(response: NextResponse, protocol: string) {
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", contentSecurityPolicyValue);
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=()",
  );

  if (process.env.NODE_ENV === "production" && protocol === httpsProtocol) {
    response.headers.set("Strict-Transport-Security", strictTransportSecurityValue);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
