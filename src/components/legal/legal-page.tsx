import Link from "next/link";
import type { ReactNode } from "react";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
import { appConfig } from "@/lib/app-config";
import { getActiveMaintenanceMessage } from "@/domains/operations/platform-announcement-service";

type LegalPageProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export async function LegalPage({ children, description, title }: LegalPageProps) {
  const maintenanceMessage = await getActiveMaintenanceMessage();

  return (
    <main
      className="flex min-h-screen flex-col bg-background text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <GlobalMaintenanceBanner message={maintenanceMessage} />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link
            className="text-sm font-semibold text-text-control underline-offset-4 transition hover:text-brand hover:underline"
            href="/"
          >
            {appConfig.name}
          </Link>
          <Link
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            href="/"
          >
            Sign in
          </Link>
        </header>

        <article className="theme-panel mt-5 p-5 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            Policy
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-text-muted">
            {description}
          </p>
          <p className="mt-3 text-sm font-semibold text-text-subtle">
            Last updated: 5 July 2026
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-text-label">
            {children}
          </div>
        </article>

        <AppFooter />
      </div>
    </main>
  );
}

export function LegalSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
