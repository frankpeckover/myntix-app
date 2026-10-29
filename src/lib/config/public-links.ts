import { appConfig } from "./app-config";

export const publicLinks = [
  ...[
    { label: "Privacy", path: "/privacy", description: "How Myntix handles personal information." },
    { label: "Terms", path: "/terms", description: "The terms for using Myntix." },
    { label: "Data retention", path: "/data-retention", description: "How long information is kept and how deletion is handled." },
  ].map(({ label, path, description }) => ({
    label,
    description,
    href: new URL(path, appConfig.marketingSiteUrl).href,
  })),
  { label: "Support", href: `mailto:${appConfig.supportEmail}`, description: "Email Myntix for product support." },
];
