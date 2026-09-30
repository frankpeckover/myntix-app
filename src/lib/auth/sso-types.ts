export type SsoProviderType = "google" | "microsoft_entra";

export type SsoProviderSettings = {
  allowedDomain: string;
  clientId: string;
  displayName: string;
  hasClientSecret: boolean;
  isEnabled: boolean;
  isJitEnabled: boolean;
  issuerUrl: string;
  providerType: SsoProviderType;
  tenantId: string;
};

export type PublicSsoProvider = {
  displayName: string;
  providerType: SsoProviderType;
};

export const ssoProviderDefaults: Record<
  SsoProviderType,
  {
    displayName: string;
    issuerUrl: string;
  }
> = {
  google: {
    displayName: "Google",
    issuerUrl: "https://accounts.google.com",
  },
  microsoft_entra: {
    displayName: "Microsoft",
    issuerUrl: "https://login.microsoftonline.com",
  },
};
