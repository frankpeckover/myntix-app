import { appConfig } from "@/lib/config/app-config";
import Link from "next/link";

type AppFooterProps = {
  contactEmail?: string;
  schoolName?: string;
};

export function AppFooter({
  contactEmail = "",
  schoolName = "",
}: AppFooterProps) {
  const displaySchoolName = schoolName.trim();
  const supportEmail = contactEmail.trim() || appConfig.supportEmail;
  const supportSubject = encodeURIComponent(`${appConfig.name} support request`);

  return (
    <footer className="mt-auto pt-8">
      <div className="border-t border-border-subtle py-5">
        <div className="flex flex-col gap-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-text-control">
              {appConfig.name}
            </p>
            <p className="mt-1 truncate">
              {displaySchoolName
                ? `${displaySchoolName} reward banking`
                : appConfig.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/data-retention">Data retention</FooterLink>
            <a
              className="font-semibold text-text-control underline-offset-4 transition hover:text-brand hover:underline"
              href={`mailto:${supportEmail}?subject=${supportSubject}`}
            >
              Support
            </a>
            <span className="text-text-subtle">
              Version {appConfig.version}
            </span>
            <span className="text-text-subtle">
              Copyright {appConfig.name}. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link
      className="font-semibold text-text-control underline-offset-4 transition hover:text-brand hover:underline"
      href={href}
    >
      {children}
    </Link>
  );
}
