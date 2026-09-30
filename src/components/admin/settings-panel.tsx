"use client";

import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  exportSchoolData,
  getSchoolInfo,
  getSetupChecklist,
  listSsoProviderSettings,
  getTransactionPresets,
  updateSchoolInfo,
  updateSsoProvider,
  updateTransactionPresets,
  uploadSchoolLogo,
  setSetupChecklistDismissed,
} from "@/lib/actions";
import { appConfig } from "@/lib/config/app-config";
import { defaultCurrencyName } from "@/lib/config/school-defaults";
import {
  defaultTransactionPresets,
  maxQuickAmounts,
  maxQuickReasons,
} from "@/lib/ledger/transaction-presets";
import {
  CogIcon,
  CheckIcon,
  ChevronDownIcon,
  FileDownIcon,
  FileUpIcon,
  KeyIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { ApiKeySettings } from "@/components/admin/settings/api-key-settings";
import { BackupManagementSettings } from "@/components/admin/settings/backup-management-settings";
import { TassSyncSettingsPanel } from "@/components/admin/settings/tass-sync-settings";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { SchoolLogo } from "@/components/ui/school-logo";
import type { SchoolInfo } from "@/domains/organisation/school-service";
import type { SsoProviderSettings, SsoProviderType } from "@/lib/auth/sso-types";

type AdminSettingsPanelProps = {
  onSchoolInfoUpdated: (schoolInfo: SchoolInfo) => void;
};

const fallbackSchoolInfo: SchoolInfo = {
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

const logoHelpText = "PNG, JPG, WebP, or GIF. Max 2 MB.";
const emptySsoSecrets: Record<SsoProviderType, string> = {
  google: "",
  microsoft_entra: "",
};
export function AdminSettingsPanel({
  onSchoolInfoUpdated,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SchoolInfo>(fallbackSchoolInfo);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPresets, setIsSavingPresets] = useState(false);
  const [presetAmounts, setPresetAmounts] = useState<string[]>(
    getPresetAmountFields(defaultTransactionPresets.amounts),
  );
  const [presetReasons, setPresetReasons] = useState<string[]>(
    getPresetReasonFields(defaultTransactionPresets.reasons),
  );
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [ssoProviders, setSsoProviders] = useState<SsoProviderSettings[]>([]);
  const [ssoSecrets, setSsoSecrets] =
    useState<Record<SsoProviderType, string>>(emptySsoSecrets);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [ssoMessage, setSsoMessage] = useState<string | null>(null);
  const [savingSsoProvider, setSavingSsoProvider] =
    useState<SsoProviderType | null>(null);
  const [isSetupChecklistDismissed, setIsSetupChecklistDismissed] =
    useState(false);
  const [isRestoringSetupChecklist, setIsRestoringSetupChecklist] =
    useState(false);
  const [setupChecklistMessage, setSetupChecklistMessage] =
    useState<string | null>(null);
  const [setupChecklistError, setSetupChecklistError] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolInfo() {
      try {
        const schoolInfo = await getSchoolInfo();

        if (isMounted) {
          setForm(schoolInfo);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load school settings.");
        }
      }
    }

    loadSchoolInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getSetupChecklist()
      .then((summary) => {
        if (isMounted) setIsSetupChecklistDismissed(summary.isDismissed);
      })
      .catch(() => {
        if (isMounted) {
          setSetupChecklistError("Could not load setup checklist settings.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function restoreSetupChecklist() {
    setIsRestoringSetupChecklist(true);
    setSetupChecklistError(null);
    setSetupChecklistMessage(null);

    try {
      await setSetupChecklistDismissed(false);
      setIsSetupChecklistDismissed(false);
      setSetupChecklistMessage("The setup checklist has been restored to the admin dashboard.");
    } catch {
      setSetupChecklistError("Could not restore the setup checklist.");
    } finally {
      setIsRestoringSetupChecklist(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSsoProviders() {
      try {
        const providers = await listSsoProviderSettings();

        if (isMounted) {
          setSsoProviders(providers);
          setSsoError(null);
        }
      } catch {
        if (isMounted) {
          setSsoError("Could not load SSO settings.");
        }
      }
    }

    loadSsoProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactionPresets() {
      try {
        const presets = await getTransactionPresets();

        if (isMounted) {
          setPresetAmounts(getPresetAmountFields(presets.amounts));
          setPresetReasons(getPresetReasonFields(presets.reasons));
          setPresetError(null);
        }
      } catch {
        if (isMounted) {
          setPresetError("Could not load quick amounts and reasons.");
        }
      }
    }

    loadTransactionPresets();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSchoolSettings(successMessage: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    let logoUrl = form.logoUrl;

    if (logoFile) {
      const logoFormData = new FormData();
      logoFormData.append("logo", logoFile);

      const uploadResult = await uploadSchoolLogo(logoFormData);

      if (!uploadResult.ok) {
        setError(uploadResult.message);
        setIsSaving(false);
        return;
      }

      logoUrl = uploadResult.logoUrl;
    }

    const result = await updateSchoolInfo({
      ...form,
      logoUrl,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    const savedSchoolInfo = {
      ...form,
      logoUrl,
    };

    setForm(savedSchoolInfo);
    setLogoFile(null);
    setMessage(successMessage);
    setIsSaving(false);
    onSchoolInfoUpdated(savedSchoolInfo);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSchoolSettings("Organisation profile saved.");
  }

  async function handleAppearanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSchoolSettings("Appearance settings saved.");
  }

  async function handleRewardRulesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSchoolSettings("Reward settings saved.");
  }

  function updateField<Field extends keyof SchoolInfo>(
    field: Field,
    value: SchoolInfo[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handlePresetsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPresets(true);
    setPresetError(null);
    setPresetMessage(null);

    const result = await updateTransactionPresets({
      amounts: presetAmounts
        .map((amount) => Number(amount))
        .filter((amount) => Number.isInteger(amount) && amount > 0),
      reasons: presetReasons.map((reason) => reason.trim()).filter(Boolean),
    });

    if (!result.ok) {
      setPresetError(result.message);
      setIsSavingPresets(false);
      return;
    }

    setPresetMessage("Quick amounts and reasons saved.");
    setIsSavingPresets(false);
  }

  async function handleDataExport() {
    setIsExporting(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const exportResult = await exportSchoolData();

      downloadBase64File(
        exportResult.fileName,
        exportResult.dataBase64,
        exportResult.mimeType,
      );
      setExportMessage("School data export downloaded.");
    } catch (error) {
      console.error("Export school data failed", error);
      setExportError("Could not export school data.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSsoSubmit(
    event: FormEvent<HTMLFormElement>,
    provider: SsoProviderSettings,
  ) {
    event.preventDefault();
    setSavingSsoProvider(provider.providerType);
    setSsoError(null);
    setSsoMessage(null);

    const result = await updateSsoProvider({
      ...provider,
      clientSecret: ssoSecrets[provider.providerType],
    });

    if (!result.ok) {
      setSsoError(result.message);
      setSavingSsoProvider(null);
      return;
    }

    const providers = await listSsoProviderSettings();

    setSsoProviders(providers);
    setSsoSecrets((current) => ({
      ...current,
      [provider.providerType]: "",
    }));
    setSsoMessage(`${provider.displayName} SSO settings saved.`);
    setSavingSsoProvider(null);
  }

  function updateSsoProviderField<Field extends keyof SsoProviderSettings>(
    providerType: SsoProviderType,
    field: Field,
    value: SsoProviderSettings[Field],
  ) {
    setSsoProviders((currentProviders) =>
      currentProviders.map((provider) =>
        provider.providerType === providerType
          ? { ...provider, [field]: value }
          : provider,
      ),
    );
  }

  return (
    <section className="mt-5 space-y-6">
      <SettingsGroup
        description="Platform details and support information for this instance."
        title="Account"
      >
        <SettingsPanel collapsible={false} icon={<CogIcon />} title="Application">
          <div className="grid gap-4 sm:grid-cols-3">
            <ReadOnlySetting label="App name" value={appConfig.name} />
            <ReadOnlySetting label="Version" value={appConfig.version} />
            <ReadOnlySetting
              label="Support"
              value={appConfig.supportEmail}
            />
          </div>
        </SettingsPanel>
        <SettingsPanel icon={<CheckIcon />} title="Getting Started">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-control">
                Admin setup checklist
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {isSetupChecklistDismissed
                  ? "The checklist is permanently dismissed for your account."
                  : "The checklist is available on your admin dashboard."}
              </p>
            </div>
            {isSetupChecklistDismissed && (
              <button
                className="shrink-0 rounded-md border border-button-border bg-surface px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover disabled:opacity-60"
                disabled={isRestoringSetupChecklist}
                onClick={restoreSetupChecklist}
                type="button"
              >
                {isRestoringSetupChecklist ? "Restoring..." : "Restore Checklist"}
              </button>
            )}
          </div>
          <div className="mt-3">
            <SettingsMessages
              error={setupChecklistError}
              message={setupChecklistMessage}
            />
          </div>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup
        description="Core organisation details shown throughout the app."
        title="Organisation"
      >
        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <SettingsPanel defaultExpanded icon={<UsersIcon />} title="Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                id="schoolName"
                label="School name"
                onChange={(value) => updateField("name", value)}
                required
                value={form.name}
              />
              <TextField
                id="timezone"
                label="Timezone"
                onChange={(value) => updateField("timezone", value)}
                placeholder="Australia/Brisbane"
                value={form.timezone}
              />
              <TextField
                id="contactEmail"
                label="Contact email"
                onChange={(value) => updateField("contactEmail", value)}
                placeholder="office@example.edu"
                type="email"
                value={form.contactEmail}
              />
              <TextField
                id="phone"
                label="Phone"
                onChange={(value) => updateField("phone", value)}
                placeholder="+61..."
                value={form.phone}
              />
              <TextField
                id="website"
                label="Website"
                onChange={(value) => updateField("website", value)}
                placeholder="https://example.edu"
                type="url"
                value={form.website}
              />
              <TextField
                id="address"
                label="Address"
                onChange={(value) => updateField("address", value)}
                value={form.address}
              />
            </div>
            <div className="mt-5">
              <SettingsActionRow
                error={error}
                isSaving={isSaving}
                message={message}
                saveLabel="Save Organisation"
              />
            </div>
          </SettingsPanel>
        </form>
      </SettingsGroup>

      <SettingsGroup
        description="Visual identity used in headers and organisation areas."
        title="Appearance"
      >
        <form className="space-y-4" onSubmit={handleAppearanceSubmit}>
          <SettingsPanel
            icon={<FileUpIcon />}
            info="This logo appears beside the school name on the sign-in screen and in dashboard headers."
            title="Logo"
          >
            <LogoUploadField
              currentLogoUrl={form.logoUrl}
              fileName={logoFile?.name ?? ""}
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              schoolName={form.name}
            />
            <div className="mt-5">
              <SettingsActionRow
                error={error}
                isSaving={isSaving}
                message={message}
                saveLabel="Save Appearance"
              />
            </div>
          </SettingsPanel>
        </form>
      </SettingsGroup>

      <SettingsGroup
        description="Currency wording and optional guardrails for balances."
        title="Rewards"
      >
        <form className="space-y-4" onSubmit={handleRewardRulesSubmit}>
          <SettingsPanel
            icon={<WalletIcon />}
            info="These rules apply to every student account in this organisation."
            title="Currency Rules"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                id="currencyName"
                info="Changes the name used for this organisation's currency throughout the app. It does not convert existing balances."
                label="Currency name"
                onChange={(value) => updateField("currencyName", value)}
                required
                value={form.currencyName}
              />
              <NumberField
                id="balanceCap"
                info="An optional maximum balance for each student. Credit adjustments that would exceed this limit are blocked. Leave it blank to allow any balance."
                label="Balance cap"
                min={1}
                onChange={(value) => updateField("balanceCap", value)}
                placeholder="No cap"
                value={form.balanceCap}
              />
            </div>
            <div className="mt-5">
              <SettingsActionRow
                error={error}
                isSaving={isSaving}
                message={message}
                saveLabel="Save Rewards"
              />
            </div>
          </SettingsPanel>
        </form>
      </SettingsGroup>

      <SettingsGroup
        description="Teacher presets for faster credit and debit workflows."
        title="Teacher Workflow"
      >
        <form className="space-y-5" onSubmit={handlePresetsSubmit}>
          <SettingsPanel
            icon={<WalletIcon />}
            info="These are the organisation defaults. Teachers can personalise their own quick amounts and reasons in their Settings."
            title="Quick Transactions"
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <QuickAmountFields
                amounts={presetAmounts}
                onChange={setPresetAmounts}
              />
              <QuickReasonFields
                onChange={setPresetReasons}
                reasons={presetReasons}
              />
            </div>
            <div className="mt-5">
              <SettingsActionRow
                error={presetError}
                isSaving={isSavingPresets}
                message={presetMessage}
                saveLabel="Save Quick Transactions"
              />
            </div>
          </SettingsPanel>
        </form>
      </SettingsGroup>

      <SettingsGroup
        description="Single sign-on providers shown on the login page."
        title="Auth"
      >
        <SettingsPanel
          icon={<KeyIcon />}
          info="Single sign-on matches existing users by email. Optionally, verified users from an allowed domain can receive a new student account on first sign-in."
          title="Single Sign-On"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {ssoProviders.map((provider) => (
              <SsoProviderForm
                key={provider.providerType}
                clientSecret={ssoSecrets[provider.providerType]}
                isSaving={savingSsoProvider === provider.providerType}
                onClientSecretChange={(value) =>
                  setSsoSecrets((current) => ({
                    ...current,
                    [provider.providerType]: value,
                  }))
                }
                onChange={updateSsoProviderField}
                onSubmit={(event) => handleSsoSubmit(event, provider)}
                provider={provider}
              />
            ))}
          </div>
          <div className="mt-4">
            <SettingsMessages error={ssoError} message={ssoMessage} />
          </div>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup
        description="Authoritative data sources for users, classes, and schedules."
        title="Sync Sources"
      >
        <SettingsPanel
          icon={<SlidersHorizontalIcon />}
          info="Synced records retain a source mapping so later runs update or archive only records managed by that source."
          title="TASS"
        >
          <TassSyncSettingsPanel />
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup
        description="External access for approved integrations."
        title="API"
      >
        <SettingsPanel
          icon={<KeyIcon />}
          info="API keys let approved integrations act within the permissions you assign. Copy a new key when it is shown because it cannot be displayed again."
          title="API Keys"
        >
          <ApiKeySettings />
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup
        description="Administrative export tools for portability and retention."
        title="Data"
      >
        <SettingsPanel
          icon={<FileDownIcon />}
          info="Create encrypted tenant backups and restore verified recovery points. Restores create a safety backup before replacing current data."
          title="Backups and Restore"
        >
          <BackupManagementSettings />
        </SettingsPanel>
        <SettingsPanel
          icon={<FileDownIcon />}
          info="The export is for organisation data only. Sensitive authentication and platform data is intentionally excluded."
          title="Data Export"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-control">
                Export organisation data
              </p>
              <p className="mt-1 max-w-2xl text-sm text-text-muted">
                Downloads a ZIP file of CSV exports plus a manifest. Password
                hashes, sessions, reset tokens, platform credentials, and server
                error logs are not included.
              </p>
            </div>
            <button
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isExporting}
              onClick={handleDataExport}
              type="button"
            >
              <FileDownIcon />
              {isExporting ? "Exporting..." : "Export Data"}
            </button>
          </div>
          <div className="mt-4">
            <SettingsMessages error={exportError} message={exportMessage} />
          </div>
        </SettingsPanel>
      </SettingsGroup>
    </section>
  );
}

function SettingsGroup({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-3 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-6">
      <div className="pt-1">
        <h2 className="text-sm font-semibold text-text-control">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          {description}
        </p>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function ReadOnlySetting({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-surface-muted px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-kicker">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-text-control">
        {value || "-"}
      </p>
    </div>
  );
}

function SettingsActionRow({
  error,
  isSaving,
  message,
  saveLabel,
}: {
  error: string | null;
  isSaving: boolean;
  message: string | null;
  saveLabel: string;
}) {
  return (
    <div className="flex items-center justify-end">
      <SettingsMessages error={error} message={message} />
      <button
        className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

function SettingsPanel({
  children,
  collapsible = true,
  defaultExpanded = false,
  icon,
  info,
  title,
}: {
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon: ReactNode;
  info?: string;
  title: string;
}) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || !collapsible,
  );
  const contentId = useId();

  return (
    <section className="theme-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              {info && <InfoTooltip label={info} />}
            </div>
          </div>
        </div>
        {collapsible && (
          <button
            aria-controls={contentId}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-muted hover:text-text-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>
      <div
        className="mt-5 min-w-0"
        hidden={collapsible && !isExpanded}
        id={contentId}
      >
        {children}
      </div>
    </section>
  );
}

function SsoProviderForm({
  clientSecret,
  isSaving,
  onChange,
  onClientSecretChange,
  onSubmit,
  provider,
}: {
  clientSecret: string;
  isSaving: boolean;
  onChange: <Field extends keyof SsoProviderSettings>(
    providerType: SsoProviderType,
    field: Field,
    value: SsoProviderSettings[Field],
  ) => void;
  onClientSecretChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  provider: SsoProviderSettings;
}) {
  const isMicrosoft = provider.providerType === "microsoft_entra";

  return (
    <form className="theme-subpanel min-w-0 space-y-4 p-4" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-text-control">
            {provider.displayName}
          </h4>
          <p className="mt-1 text-sm text-text-muted">
            {provider.isEnabled ? "Enabled on the login page" : "Hidden from login"}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-text-control">
          <input
            checked={provider.isEnabled}
            className="h-4 w-4 accent-[var(--color-brand)]"
            onChange={(event) =>
              onChange(provider.providerType, "isEnabled", event.target.checked)
            }
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${provider.providerType}-display-name`}
          label="Button label"
          onChange={(value) =>
            onChange(provider.providerType, "displayName", value)
          }
          value={provider.displayName}
        />
        <TextField
          id={`${provider.providerType}-client-id`}
          label="Client ID"
          onChange={(value) =>
            onChange(provider.providerType, "clientId", value)
          }
          value={provider.clientId}
        />
        {isMicrosoft && (
          <TextField
            id={`${provider.providerType}-tenant-id`}
            label="Tenant ID"
            onChange={(value) =>
              onChange(provider.providerType, "tenantId", value)
            }
            value={provider.tenantId}
          />
        )}
        <TextAreaField
          id={`${provider.providerType}-allowed-domain`}
          info="Only verified email addresses from these domains can use this provider. Enter one domain per line or separate domains with commas."
          label={isMicrosoft ? "Allowed domains" : "Google Workspace domains"}
          onChange={(value) =>
            onChange(provider.providerType, "allowedDomain", value)
          }
          placeholder={`example.edu\nstudents.example.edu`}
          value={provider.allowedDomain}
        />
        <TextField
          id={`${provider.providerType}-issuer-url`}
          label="Issuer URL"
          onChange={(value) =>
            onChange(provider.providerType, "issuerUrl", value)
          }
          type="url"
          value={provider.issuerUrl}
        />
        <SsoSecretField
          hasClientSecret={provider.hasClientSecret}
          id={`${provider.providerType}-client-secret`}
          onChange={onClientSecretChange}
          value={clientSecret}
        />
      </div>

      <label className="flex items-start gap-3 rounded-md bg-panel-soft px-3 py-3 text-sm text-text-control">
        <input
          checked={provider.isJitEnabled}
          className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
          onChange={(event) =>
            onChange(
              provider.providerType,
              "isJitEnabled",
              event.target.checked,
            )
          }
          type="checkbox"
        />
        <span>
          <span className="block font-semibold">Create student accounts on first sign-in</span>
          <span className="mt-0.5 block text-text-muted">
            Only verified accounts matching an allowed domain can be created.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : `Save ${provider.displayName}`}
        </button>
      </div>
    </form>
  );
}

function TextField({
  id,
  info,
  label,
  onChange,
  placeholder = "",
  required = false,
  type = "text",
  value,
}: {
  id: string;
  info?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "text" | "url";
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-text-control" htmlFor={id}>
          {label}
        </label>
        {info && <InfoTooltip label={info} />}
      </div>
      <input
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}

function NumberField({
  id,
  info,
  label,
  min,
  onChange,
  placeholder = "",
  value,
}: {
  id: string;
  info?: string;
  label: string;
  min?: number;
  onChange: (value: number | null) => void;
  placeholder?: string;
  value: number | null;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-text-control" htmlFor={id}>
          {label}
        </label>
        {info && <InfoTooltip label={info} />}
      </div>
      <input
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        min={min}
        onChange={(event) => {
          const nextValue = event.target.value.trim();

          onChange(nextValue ? Number(nextValue) : null);
        }}
        placeholder={placeholder}
        type="number"
        value={value ?? ""}
      />
      <p className="mt-1 text-xs text-text-muted">
        Leave blank for no maximum balance.
      </p>
    </div>
  );
}

function TextAreaField({
  id,
  info,
  label,
  onChange,
  placeholder = "",
  value,
}: {
  id: string;
  info?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-text-control" htmlFor={id}>
          {label}
        </label>
        {info && <InfoTooltip label={info} />}
      </div>
      <textarea
        className="mt-2 block min-h-28 w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <p className="mt-1 text-xs text-text-muted">
        Enter one per line, or separate with commas.
      </p>
    </div>
  );
}

function SsoSecretField({
  hasClientSecret,
  id,
  onChange,
  value,
}: {
  hasClientSecret: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        Client secret
      </label>
      <input
        autoComplete="new-password"
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hasClientSecret ? "Stored. Enter a new value to replace." : ""}
        type="password"
        value={value}
      />
    </div>
  );
}

function LogoUploadField({
  currentLogoUrl,
  fileName,
  onChange,
  schoolName,
}: {
  currentLogoUrl: string;
  fileName: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  schoolName: string;
}) {
  return (
    <div className="theme-subpanel min-w-0 overflow-hidden p-3 sm:p-4">
      <label className="text-sm font-semibold text-text-control" htmlFor="logo">
        Logo
      </label>
      <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
        <SchoolLogo logoUrl={currentLogoUrl} name={schoolName} size="large" />
        <div className="min-w-0 flex-1">
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            id="logo"
            onChange={onChange}
            type="file"
          />
          <label
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
            htmlFor="logo"
            title="Upload logo"
          >
            <FileUpIcon />
            <span className="hidden sm:ml-2 sm:inline">Upload Logo</span>
          </label>
          <p className="mt-2 truncate text-sm text-text-muted">
            {fileName || logoHelpText}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAmountFields({
  amounts,
  onChange,
}: {
  amounts: string[];
  onChange: (amounts: string[]) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Quick amounts</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-5 lg:grid-cols-1">
        {amounts.map((amount, index) => (
          <input
            className="block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            key={`amount-${index}`}
            min="1"
            onChange={(event) =>
              onChange(updateArrayItem(amounts, index, event.target.value))
            }
            placeholder={`Amount ${index + 1}`}
            type="number"
            value={amount}
          />
        ))}
      </div>
    </div>
  );
}

function QuickReasonFields({
  onChange,
  reasons,
}: {
  onChange: (reasons: string[]) => void;
  reasons: string[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Quick reasons</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {reasons.map((reason, index) => (
          <input
            className="block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            key={`reason-${index}`}
            onChange={(event) =>
              onChange(updateArrayItem(reasons, index, event.target.value))
            }
            placeholder={`Reason ${index + 1}`}
            type="text"
            value={reason}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsMessages({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  return <FixedNotification error={error} message={message} />;
}

function downloadBase64File(filename: string, dataBase64: string, type: string) {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getPresetAmountFields(amounts: number[]) {
  return padPresetFields(
    amounts.slice(0, maxQuickAmounts).map((amount) => String(amount)),
    maxQuickAmounts,
  );
}

function getPresetReasonFields(reasons: string[]) {
  return padPresetFields(
    reasons.slice(0, maxQuickReasons),
    maxQuickReasons,
  );
}

function padPresetFields(values: string[], length: number) {
  return [
    ...values,
    ...Array.from({ length: Math.max(0, length - values.length) }, () => ""),
  ].slice(0, length);
}

function updateArrayItem(values: string[], index: number, value: string) {
  return values.map((currentValue, currentIndex) =>
    currentIndex === index ? value : currentValue,
  );
}
