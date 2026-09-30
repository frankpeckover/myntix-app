import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/database/db";
import type { ActionResult } from "@/lib/actions/action-results";
import { appConfig } from "@/lib/config/app-config";
import { defaultCurrencyName } from "@/lib/config/school-defaults";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

export type SchoolInfo = {
  name: string;
  address: string;
  balanceCap: number | null;
  contactEmail: string;
  currencyName: string;
  logoUrl: string;
  phone: string;
  website: string;
  timezone: string;
};

export type UpdateSchoolInfoInput = SchoolInfo;

export type UploadSchoolLogoResult =
  | {
      ok: true;
      logoUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

type SchoolInfoRow = {
  name: string;
  address: string;
  balance_cap: number | null;
  contact_email: string;
  currency_name: string;
  logo_url: string;
  phone: string;
  website: string;
  timezone: string;
};

const auditService = new AuditService();
const logoUploadDirectory = path.join(process.cwd(), "public", "uploads", "logos");
const logoPublicPath = "/uploads/logos";
const bytesPerKilobyte = 1024;
const kilobytesPerMegabyte = 1024;
const maxLogoFileSizeMegabytes = 2;
const maxLogoFileSizeBytes =
  maxLogoFileSizeMegabytes * kilobytesPerMegabyte * bytesPerKilobyte;
const allowedLogoTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export class SchoolService {
  async getSchoolInfo(): Promise<SchoolInfo> {
    const result = await db.query<SchoolInfoRow>(`
      select
        name,
        address,
        balance_cap,
        contact_email,
        currency_name,
        logo_url,
        phone,
        website,
        timezone
      from school_info
      where id = 1
      limit 1
    `);

    const schoolInfo = result.rows[0];

    if (!schoolInfo) {
      return {
        name: appConfig.defaultSchoolName,
        address: "",
        balanceCap: null,
        contactEmail: "",
        currencyName: defaultCurrencyName,
        logoUrl: "",
        phone: "",
        website: "",
        timezone: "",
      };
    }

    return this.mapSchoolInfoRow(schoolInfo);
  }

  async updateSchoolInfo(
    currentUser: SessionUser,
    input: UpdateSchoolInfoInput,
  ): Promise<ActionResult> {
    const name = input.name.trim();
    const address = input.address.trim();
    const balanceCap = input.balanceCap;
    const contactEmail = input.contactEmail.trim().toLowerCase();
    const currencyName = input.currencyName.trim();
    const logoUrl = input.logoUrl.trim();
    const phone = input.phone.trim();
    const website = input.website.trim();
    const timezone = input.timezone.trim();

    if (!name || !currencyName) {
      return {
        ok: false,
        message: "School name and currency name are required.",
      };
    }

    if (timezone && !isValidIanaTimezone(timezone)) {
      return {
        ok: false,
        message: "Enter a valid IANA timezone, such as Australia/Brisbane.",
      };
    }

    if (
      balanceCap !== null &&
      (!Number.isInteger(balanceCap) || balanceCap <= 0)
    ) {
      return {
        ok: false,
        message: "Balance cap must be a positive whole number, or blank.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      await client.query(
        `
          insert into school_info (
            id,
            name,
            address,
            balance_cap,
            contact_email,
            currency_name,
            logo_url,
            phone,
            website,
            timezone
          )
          values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do update
          set name = excluded.name,
              address = excluded.address,
              balance_cap = excluded.balance_cap,
              contact_email = excluded.contact_email,
              currency_name = excluded.currency_name,
              logo_url = excluded.logo_url,
              phone = excluded.phone,
              website = excluded.website,
              timezone = excluded.timezone,
              updated_at = now()
        `,
        [
          name,
          address,
          balanceCap,
          contactEmail,
          currencyName,
          logoUrl,
          phone,
          website,
          timezone,
        ],
      );

      await auditService.logWithClient(client, {
        action: "school_info.updated",
        actorUserId: currentUser.id,
        details: {
          contactEmail,
          balanceCap,
          currencyName,
          hasLogo: Boolean(logoUrl),
          name,
          timezone,
        },
        entityId: null,
        entityType: "school_info",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Update school info failed", error);

      return {
        ok: false,
        message: "Could not update school info.",
      };
    } finally {
      client.release();
    }
  }

  async uploadLogo(file: File): Promise<UploadSchoolLogoResult> {
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Choose a logo file.",
      };
    }

    if (file.size > maxLogoFileSizeBytes) {
      return {
        ok: false,
        message: `Logo must be ${maxLogoFileSizeMegabytes} MB or smaller.`,
      };
    }

    const extension = allowedLogoTypes.get(file.type);

    if (!extension) {
      return {
        ok: false,
        message: "Logo must be a PNG, JPG, WebP, or GIF file.",
      };
    }

    try {
      await mkdir(logoUploadDirectory, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(logoUploadDirectory, fileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, fileBytes);

      return {
        ok: true,
        logoUrl: `${logoPublicPath}/${fileName}`,
      };
    } catch (error) {
      console.error("Upload school logo failed", error);

      return {
        ok: false,
        message: "Could not upload logo.",
      };
    }
  }

  private mapSchoolInfoRow(row: SchoolInfoRow): SchoolInfo {
    return {
      name: row.name,
      address: row.address,
      balanceCap: row.balance_cap === null ? null : Number(row.balance_cap),
      contactEmail: row.contact_email,
      currencyName: row.currency_name,
      logoUrl: row.logo_url,
      phone: row.phone,
      website: row.website,
      timezone: row.timezone,
    };
  }
}

function isValidIanaTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
