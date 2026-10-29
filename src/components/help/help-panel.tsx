import { publicLinks } from "@/lib/config/public-links";

export function HelpPanel() {
  return (
    <section className="max-w-2xl space-y-4">
      <p className="text-sm text-text-muted">
        For questions about your account, credits or rewards, contact your school&apos;s administrator.
      </p>
      <ul className="divide-y divide-border-subtle">
        {publicLinks.map(({ label, href, description }) => {
          const opensNewTab = href.startsWith("https:");
          return (
            <li key={label} className="py-3">
              <a
                aria-label={opensNewTab ? `${label} (opens in a new tab)` : label}
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-brand underline underline-offset-4 transition hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                href={href}
                rel={opensNewTab ? "noopener noreferrer" : undefined}
                target={opensNewTab ? "_blank" : undefined}
              >
                {label}
              </a>
              <p className="text-sm text-text-muted">{description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
