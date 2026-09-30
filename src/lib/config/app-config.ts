const fallbackAppName = "Myntix Ledger";
const configuredAppName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || fallbackAppName;

export const appConfig = {
  defaultSchoolName:
    process.env.NEXT_PUBLIC_DEFAULT_ORGANISATION_NAME?.trim() || "Demo School",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
    "An internal currency ledger for organisations.",
  initials:
    process.env.NEXT_PUBLIC_APP_INITIALS?.trim() ||
    getInitials(configuredAppName),
  logoUrl:
    process.env.NEXT_PUBLIC_APP_LOGO_URL?.trim() ||
    "/brand/myntix-stacked-coins.png",
  lockupUrl:
    process.env.NEXT_PUBLIC_APP_LOCKUP_URL?.trim() ||
    "/brand/myntix-lockup.png",
  marketingSiteUrl:
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ||
    "https://myntix.com",
  wordmarkUrl:
    process.env.NEXT_PUBLIC_APP_WORDMARK_URL?.trim() ||
    "/brand/myntix-wordmark.png",
  name: configuredAppName,
  supportEmail:
    process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL?.trim() || "support@example.com",
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() ||
    "Internal currency, made simple.",
  version: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "1.0",
} as const;

function getInitials(value: string) {
  const words = value
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(" ")
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return value.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "IM";
}
