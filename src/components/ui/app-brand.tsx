import { appConfig } from "@/lib/app-config";

type AppBrandProps = {
  showLogoWithImage?: boolean;
  showNameOnMobile?: boolean;
  size?: "default" | "large";
  variant?: "default" | "wordmark";
};

export function AppBrand({
  showLogoWithImage = false,
  showNameOnMobile = false,
  size = "default",
  variant = "default",
}: AppBrandProps) {
  const logoClassName =
    size === "large"
      ? "h-12 w-12 rounded-2xl sm:h-14 sm:w-14"
      : "h-10 w-10 rounded-2xl";
  const textClassName =
    size === "large" ? "text-2xl sm:text-3xl" : "text-base sm:text-lg";
  const lockupClassName =
    size === "large"
      ? "h-12 max-w-64 sm:h-14"
      : variant === "wordmark"
        ? "h-7 max-w-[9.25rem]"
        : "h-9 max-w-[10.5rem]";
  const composedLogoClassName =
    size === "large" ? "h-10 w-24" : "h-7 w-16";
  const brandImageUrl =
    variant === "wordmark" ? appConfig.wordmarkUrl : appConfig.lockupUrl;

  if (showNameOnMobile && brandImageUrl) {
    if (showLogoWithImage) {
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <AppLogo className={composedLogoClassName} />
          {/* eslint-disable-next-line @next/next/no-img-element -- Branding paths are runtime-configurable and may not be known to next/image. */}
          <img
            alt={`${appConfig.name} logo`}
            className={`${lockupClassName} min-w-0 shrink object-contain object-left`}
            src={brandImageUrl}
          />
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element -- Branding paths are runtime-configurable and may not be known to next/image.
      <img
        alt={`${appConfig.name} logo`}
        className={`${lockupClassName} min-w-0 shrink object-contain object-left`}
        src={brandImageUrl}
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppLogo className={logoClassName} />
      <span
        className={`truncate font-bold tracking-normal text-foreground ${textClassName} ${
          showNameOnMobile ? "block" : "hidden sm:block"
        }`}
      >
        {appConfig.name}
      </span>
    </div>
  );
}

function AppLogo({ className }: { className: string }) {
  if (appConfig.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Branding paths are runtime-configurable and may not be known to next/image.
      <img
        alt={`${appConfig.name} logo`}
        className={`${className} shrink-0 object-contain`}
        src={appConfig.logoUrl}
      />
    );
  }

  return (
    <div
      aria-label={`${appConfig.name} initials`}
      className={`${className} flex shrink-0 items-center justify-center border border-border-subtle bg-surface text-sm font-bold text-brand shadow-sm`}
      role="img"
    >
      {appConfig.initials}
    </div>
  );
}
