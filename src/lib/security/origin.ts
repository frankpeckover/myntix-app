import { headers } from "next/headers";

const allowedDevelopmentHosts = new Set(["localhost", "127.0.0.1"]);
const defaultHttpsPort = "443";
const defaultHttpPort = "80";

export async function assertSameOriginRequest(options: { requireOrigin?: boolean } = {}) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (!origin) {
    if (options.requireOrigin) throw new Error("Invalid request origin.");
    return;
  }

  const originHost = getOriginHost(origin);
  const allowedHosts = getAllowedHosts(requestHeaders, !options.requireOrigin);

  if (!originHost || !allowedHosts.has(originHost)) {
    throw new Error("Invalid request origin.");
  }
}

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin && getOriginHost(origin)) {
    return new URL(origin).origin;
  }

  return process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
}

function getAllowedHosts(requestHeaders: Headers, allowAppBaseUrl: boolean) {
  const allowedHosts = new Set<string>();
  const host = requestHeaders.get("host");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const appBaseUrl = process.env.APP_BASE_URL;

  addHost(allowedHosts, host);
  addHost(allowedHosts, forwardedHost);

  if (appBaseUrl && allowAppBaseUrl) {
    addHost(allowedHosts, getOriginHost(appBaseUrl));
  }

  return allowedHosts;
}

function addHost(allowedHosts: Set<string>, host: string | null) {
  if (!host) {
    return;
  }

  allowedHosts.add(normaliseHost(host));
}

function getOriginHost(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return normaliseHost(url.host);
  } catch {
    return "";
  }
}

function normaliseHost(host: string) {
  const normalisedHost = host.trim().toLowerCase();
  const [hostname, port] = normalisedHost.split(":");

  if (
    !port ||
    port === defaultHttpsPort ||
    port === defaultHttpPort ||
    (allowedDevelopmentHosts.has(hostname) && port === "3000")
  ) {
    return hostname;
  }

  return `${hostname}:${port}`;
}
