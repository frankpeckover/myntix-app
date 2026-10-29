import { publicLinks } from "@/lib/config/public-links";

export function PublicLinks() {
  return (
    <nav aria-label="Policies and support" className="flex flex-wrap justify-center gap-x-4 text-xs text-text-muted">
      {publicLinks.map(({ label, href }) => {
        const isExternalPage = href.startsWith("https:");

        return (
          <a
            key={label}
            aria-label={isExternalPage ? `${label} (opens in a new tab)` : label}
            className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 transition hover:text-text-control hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={href}
            rel={isExternalPage ? "noopener noreferrer" : undefined}
            target={isExternalPage ? "_blank" : undefined}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
