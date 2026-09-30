import { db } from "@/lib/database/db";
import { encryptServerSecret } from "@/lib/security/server-crypto";
import {
  ssoProviderDefaults,
  type PublicSsoProvider,
  type SsoProviderSettings,
  type SsoProviderType,
} from "@/lib/auth/sso-types";
import type { ActionResult } from "@/lib/actions/action-results";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

export type UpdateSsoProviderInput = {
  allowedDomain: string;
  clientId: string;
  clientSecret: string;
  displayName: string;
  isEnabled: boolean;
  isJitEnabled: boolean;
  issuerUrl: string;
  providerType: SsoProviderType;
  tenantId: string;
};

type SsoProviderRow = {
  allowed_domain: string;
  client_id: string;
  client_secret_encrypted: string;
  display_name: string;
  is_enabled: boolean;
  is_jit_enabled: boolean;
  issuer_url: string;
  provider_type: SsoProviderType;
  tenant_id: string;
};

const auditService = new AuditService();
const providerTypes = Object.keys(ssoProviderDefaults) as SsoProviderType[];

export class SsoProviderService {
  async listSettings(): Promise<SsoProviderSettings[]> {
    const rows = await this.listProviderRows();

    return providerTypes.map((providerType) => {
      const row = rows.find((provider) => provider.provider_type === providerType);

      return mapSettingsRow(row, providerType);
    });
  }

  async listEnabledForLogin(): Promise<PublicSsoProvider[]> {
    const rows = await this.listProviderRows();

    return rows
      .filter((row) => row.is_enabled && row.client_id && row.client_secret_encrypted)
      .map((row) => ({
        displayName: row.display_name || ssoProviderDefaults[row.provider_type].displayName,
        providerType: row.provider_type,
      }));
  }

  async updateProvider(
    currentUser: SessionUser,
    input: UpdateSsoProviderInput,
  ): Promise<ActionResult> {
    if (!isSsoProviderType(input.providerType)) {
      return {
        ok: false,
        message: "Choose a valid SSO provider.",
      };
    }

    const defaults = ssoProviderDefaults[input.providerType];
    const displayName = input.displayName.trim() || defaults.displayName;
    const tenantId = input.tenantId.trim();
    const clientId = input.clientId.trim();
    const issuerUrl = input.issuerUrl.trim() || defaults.issuerUrl;
    const allowedDomainResult = normaliseAllowedDomains(input.allowedDomain);
    const clientSecret = input.clientSecret.trim();

    if (!allowedDomainResult.ok) {
      return {
        ok: false,
        message: "Allowed domains must be plain domain names like example.edu.",
      };
    }

    const allowedDomain = allowedDomainResult.value;

    if (input.isEnabled && !clientId) {
      return {
        ok: false,
        message: "Client ID is required before enabling SSO.",
      };
    }

    if (input.isEnabled && input.providerType === "microsoft_entra" && !tenantId) {
      return {
        ok: false,
        message: "Tenant ID is required before enabling Microsoft SSO.",
      };
    }

    if (input.isEnabled && input.providerType === "google" && !allowedDomain) {
      return {
        ok: false,
        message: "At least one allowed domain is required before enabling Google SSO.",
      };
    }

    if (input.isJitEnabled && !allowedDomain) {
      return {
        ok: false,
        message: "At least one allowed domain is required before enabling account creation.",
      };
    }

    const existing = await this.getProviderRow(input.providerType);

    if (input.isEnabled && !clientSecret && !existing?.client_secret_encrypted) {
      return {
        ok: false,
        message: "Client secret is required before enabling SSO.",
      };
    }

    const encryptedSecret = clientSecret
      ? encryptServerSecret(clientSecret)
      : existing?.client_secret_encrypted ?? "";

    const client = await db.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          insert into sso_identity_providers (
            provider_type,
            display_name,
            tenant_id,
            client_id,
            client_secret_encrypted,
            issuer_url,
            allowed_domain,
            is_enabled,
            is_jit_enabled
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (provider_type) do update
          set display_name = excluded.display_name,
              tenant_id = excluded.tenant_id,
              client_id = excluded.client_id,
              client_secret_encrypted = excluded.client_secret_encrypted,
              issuer_url = excluded.issuer_url,
              allowed_domain = excluded.allowed_domain,
              is_enabled = excluded.is_enabled,
              is_jit_enabled = excluded.is_jit_enabled,
              updated_at = now()
        `,
        [
          input.providerType,
          displayName,
          tenantId,
          clientId,
          encryptedSecret,
          issuerUrl,
          allowedDomain,
          input.isEnabled,
          input.isJitEnabled,
        ],
      );

      await auditService.logWithClient(client, {
        action: "sso_provider.updated",
        actorUserId: currentUser.id,
        details: {
          allowedDomain,
          hasClientSecret: Boolean(encryptedSecret),
          isEnabled: input.isEnabled,
          isJitEnabled: input.isJitEnabled,
          providerType: input.providerType,
          tenantId,
        },
        entityId: null,
        entityType: "sso_identity_provider",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Update SSO provider failed", error);

      return {
        ok: false,
        message: "Could not update SSO settings.",
      };
    } finally {
      client.release();
    }
  }

  private async listProviderRows() {
    const result = await db.query<SsoProviderRow>(`
      select
        provider_type,
        display_name,
        tenant_id,
        client_id,
        client_secret_encrypted,
        issuer_url,
        allowed_domain,
        is_enabled,
        is_jit_enabled
      from sso_identity_providers
      order by provider_type
    `);

    return result.rows;
  }

  private async getProviderRow(providerType: SsoProviderType) {
    const result = await db.query<SsoProviderRow>(
      `
        select
          provider_type,
          display_name,
          tenant_id,
          client_id,
          client_secret_encrypted,
          issuer_url,
          allowed_domain,
          is_enabled,
          is_jit_enabled
        from sso_identity_providers
        where provider_type = $1
        limit 1
      `,
      [providerType],
    );

    return result.rows[0] ?? null;
  }
}

function mapSettingsRow(
  row: SsoProviderRow | undefined,
  providerType: SsoProviderType,
): SsoProviderSettings {
  const defaults = ssoProviderDefaults[providerType];

  return {
    allowedDomain: row?.allowed_domain ?? "",
    clientId: row?.client_id ?? "",
    displayName: row?.display_name || defaults.displayName,
    hasClientSecret: Boolean(row?.client_secret_encrypted),
    isEnabled: row?.is_enabled ?? false,
    isJitEnabled: row?.is_jit_enabled ?? false,
    issuerUrl: row?.issuer_url || defaults.issuerUrl,
    providerType,
    tenantId: row?.tenant_id ?? "",
  };
}

function isSsoProviderType(value: string): value is SsoProviderType {
  return providerTypes.includes(value as SsoProviderType);
}

function normaliseAllowedDomains(value: string):
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
    } {
  const domains = value
    .split(/[\n,;]+/)
    .map((domain) => domain.trim().toLowerCase().replace(/^@+/, ""))
    .filter(Boolean);

  if (domains.some((domain) => !isValidDomain(domain))) {
    return { ok: false };
  }

  return {
    ok: true,
    value: [...new Set(domains)].join("\n"),
  };
}

function isValidDomain(domain: string) {
  return (
    domain.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)
  );
}
