import { appConfig } from "@/lib/config/app-config";
import { AppBrand } from "@/components/ui/app-brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground">
      <section className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <AppBrand showNameOnMobile size="large" />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
          Organisation not found
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-foreground">
          This address is not connected to an active organisation.
        </h1>
        <p className="mb-8 text-sm leading-6 text-text-muted">
          Check the address and try again. If this should be your organisation,
          contact your administrator.
        </p>
        <a
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
          href={appConfig.marketingSiteUrl}
        >
          Return to {appConfig.name}
        </a>
      </section>
    </main>
  );
}
