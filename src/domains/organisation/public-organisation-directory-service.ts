import { platformDb } from "@/lib/database/db";

type PublicOrganisationRow = {
  name: string;
  primary_domain: string;
  slug: string;
};

export type PublicOrganisation = {
  loginUrl: string;
  name: string;
  slug: string;
};

export class PublicOrganisationDirectoryService {
  async list(): Promise<PublicOrganisation[]> {
    const result = await platformDb.query<PublicOrganisationRow>(
      `
        select name, primary_domain, slug
        from organisations
        where is_active = true
        order by lower(name), slug
      `,
    );

    return result.rows.flatMap((organisation) => {
      const loginUrl = buildLoginUrl(organisation.primary_domain);

      if (!loginUrl) {
        return [];
      }

      return [
        {
          loginUrl,
          name: organisation.name,
          slug: organisation.slug,
        },
      ];
    });
  }
}

function buildLoginUrl(primaryDomain: string) {
  const domain = primaryDomain.trim();

  if (!domain) {
    return null;
  }

  try {
    const url = new URL(
      domain.includes("://")
        ? domain
        : `${process.env.NODE_ENV === "production" ? "https" : "http"}://${domain}`,
    );

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    url.pathname = "/";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}
