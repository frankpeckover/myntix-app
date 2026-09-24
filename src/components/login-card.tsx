"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  getPublicSchoolInfo,
  listEnabledSsoProviders,
  loginUser,
  requestPasswordReset,
} from "@/lib/actions";
import { type SessionUser } from "@/lib/session";
import type { PublicSsoProvider } from "@/lib/sso-types";
import { AppBrand } from "@/components/ui/app-brand";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
import { EyeIcon } from "@/components/ui/icons";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { SchoolLogo } from "@/components/ui/school-logo";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import type { SchoolInfo } from "@/domains/organisation/school-service";

type LoginCardProps = {
  initialMessage?: string | null;
  initialMessageTone?: LoginMessageTone;
  maintenanceMessage: string;
  onLogin: (user: SessionUser) => void;
};

type LoginMessageTone = "success" | "warning";

export function LoginCard({
  initialMessage = null,
  initialMessageTone = "success",
  maintenanceMessage,
  onLogin,
}: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [messageTone, setMessageTone] =
    useState<LoginMessageTone>(initialMessageTone);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [ssoProviders, setSsoProviders] = useState<PublicSsoProvider[]>([]);

  const schoolName = schoolInfo?.name.trim() ?? "";

  useEffect(() => {
    const ssoStatus = new URLSearchParams(window.location.search).get("sso");

    if (!ssoStatus) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("sso");
    window.history.replaceState({}, "", nextUrl);

    const timeoutId = window.setTimeout(() => {
      if (ssoStatus === "account_required") {
        setMessageTone("success");
        setMessage(
          "You were authenticated successfully. Please ask an admin to create your account before signing in.",
        );
        return;
      }

      if (ssoStatus === "sso_unavailable") {
        setError("That SSO provider is not currently enabled for this school.");
        return;
      }

      setError(getSsoErrorMessage(ssoStatus));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolInfo() {
      try {
        const loadedSchoolInfo = await getPublicSchoolInfo();

        if (isMounted) {
          setSchoolInfo(loadedSchoolInfo);
        }
      } catch {
        if (isMounted) {
          setSchoolInfo(null);
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

    async function loadSsoProviders() {
      try {
        const providers = await listEnabledSsoProviders();

        if (isMounted) {
          setSsoProviders(providers);
        }
      } catch {
        if (isMounted) {
          setSsoProviders([]);
        }
      }
    }

    loadSsoProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await loginUser(username, password);

    if (!result.ok) {
      setMessage(null);
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    setIsSubmitting(false);
    onLogin(result.user);
  }

  return (
    <main
      className="login-shell flex min-h-screen flex-col bg-background text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <GlobalMaintenanceBanner message={maintenanceMessage} />
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-5 sm:px-6 lg:px-8">
        <section className="login-panel login-entry w-full p-2 sm:p-0">
          {message && (
            <LoginMessage message={message} tone={messageTone} />
          )}

          <div className="login-entry-item mb-4 flex min-w-0 items-center justify-between gap-3">
            <AppBrand showNameOnMobile size="large" />
            {schoolName && (
              <SchoolLogo
                logoUrl={schoolInfo?.logoUrl ?? ""}
                name={schoolName}
                size="medium"
              />
            )}
          </div>
          <div className="login-entry-item mb-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {schoolName ? `Sign in to ${schoolName}` : "Sign in to your account"}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Welcome back. Enter your credentials to continue.
              </p>
            </div>
          </div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="login-entry-fields login-entry-item rounded-md border border-border bg-surface">
              <div className="login-entry-field relative border-b border-border-subtle">
                <UserFieldIcon />
                <input
                  aria-label="Username"
                  autoComplete="username"
                  className="w-full border-0 bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-text-muted focus:ring-0"
                  disabled={isSubmitting}
                  id="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Username"
                  type="text"
                  value={username}
                />
              </div>

              <div className="login-entry-field relative">
                <PasswordFieldIcon />
                <input
                  aria-label="Password"
                  autoComplete="current-password"
                  className="w-full border-0 bg-transparent py-2.5 pl-10 pr-11 text-sm outline-none transition placeholder:text-text-muted focus:ring-0"
                  disabled={isSubmitting}
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-hover hover:text-text-control"
                  disabled={isSubmitting}
                  onClick={() =>
                    setIsPasswordVisible((currentValue) => !currentValue)
                  }
                  title={isPasswordVisible ? "Hide password" : "Show password"}
                  type="button"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <p
                className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="login-entry-item login-submit-button w-full rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            {ssoProviders.length > 0 && (
              <div className="login-entry-item">
                <SsoLoginOptions providers={ssoProviders} />
              </div>
            )}

            <div className="login-entry-item text-right">
              <button
                className="text-xs font-medium text-text-muted transition hover:text-text-control disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setIsForgotPasswordOpen(true)}
                title="Request a password reset link"
                type="button"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-5 sm:px-6 lg:px-8">
        <AppFooter
          contactEmail={schoolInfo?.contactEmail ?? ""}
          schoolName={schoolName}
        />
      </div>

      {isForgotPasswordOpen && (
        <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />
      )}
    </main>
  );
}

function UserFieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LoginMessage({
  message,
  tone,
}: {
  message: string;
  tone: LoginMessageTone;
}) {
  const toneClassName =
    tone === "warning"
      ? "border-warning-border bg-warning-soft text-warning"
      : "border-success-border bg-success-soft text-success";

  return (
    <p
      className={`login-entry-item mb-4 rounded-md border px-3 py-2 text-sm font-medium ${toneClassName}`}
      role={tone === "warning" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

function PasswordFieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="11" rx="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function getSsoErrorMessage(status: string) {
  const messages: Record<string, string> = {
    account_disabled: "This account has been disabled. Contact your administrator.",
    expired_token: "SSO sign-in failed because the provider token expired.",
    email_domain_mismatch: "SSO sign-in failed because the account email domain does not match the allowed domains in SSO settings.",
    hosted_domain_missing: "SSO sign-in failed because Google did not return a Workspace domain.",
    hosted_domain_mismatch: "SSO sign-in failed because the Google Workspace domain does not match this school.",
    invalid_audience: "SSO sign-in failed because the client ID did not match.",
    invalid_callback_values: "SSO sign-in failed because the provider callback was not valid.",
    invalid_issuer: "SSO sign-in failed because the issuer URL did not match the provider.",
    invalid_nonce: "SSO sign-in failed because the login session could not be verified. Try again.",
    missing_callback_values: "SSO sign-in failed because the provider callback was incomplete.",
    missing_email: "SSO sign-in failed because the provider did not return an email address.",
    missing_id_token: "SSO sign-in failed because the provider did not return an ID token.",
    missing_verified_email: "SSO sign-in failed because the provider did not return a verified email.",
    provider_error: "The SSO provider returned an error before sign-in completed.",
    signing_key_not_found: "SSO sign-in failed because the provider signing key could not be found.",
    signing_keys_unavailable: "SSO sign-in failed because provider signing keys could not be loaded.",
    state_mismatch: "SSO sign-in failed because the login session could not be matched. Try again.",
    tenant_mismatch: "SSO sign-in failed because the Microsoft tenant did not match this school.",
    token_exchange_failed: "SSO sign-in failed during the provider token exchange.",
    unknown_provider: "That SSO provider is not recognised.",
    unverified_email: "SSO sign-in failed because the provider email is not verified.",
    unsupported_token_algorithm: "SSO sign-in failed because the provider token algorithm is not supported.",
  };

  return messages[status] ?? "SSO sign-in could not be completed.";
}

function SsoLoginOptions({ providers }: { providers: PublicSsoProvider[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          Or sign in with
        </span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="grid gap-2">
        {providers.map((provider) => (
          <a
            className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-control transition hover:bg-surface-muted"
            href={`/auth/sso/${provider.providerType}`}
            key={provider.providerType}
          >
            <SsoProviderIcon providerType={provider.providerType} />
            <span>{provider.displayName}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function SsoProviderIcon({
  providerType,
}: {
  providerType: PublicSsoProvider["providerType"];
}) {
  if (providerType === "google") {
    return (
      <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" fill="#4285F4" />
        <path d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" fill="#34A853" />
        <path d="M6.39 13.93A6.01 6.01 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" fill="#FBBC05" />
        <path d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" fill="#EA4335" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path d="M2 2h9.5v9.5H2Z" fill="#F25022" />
      <path d="M12.5 2H22v9.5h-9.5Z" fill="#7FBA00" />
      <path d="M2 12.5h9.5V22H2Z" fill="#00A4EF" />
      <path d="M12.5 12.5H22V22h-9.5Z" fill="#FFB900" />
    </svg>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useDialogFocus({ onEscape: onClose });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const result = await requestPasswordReset(identifier);

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(result.message);
    setIsSubmitting(false);
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-label="Reset password"
        aria-modal="true"
        className="app-modal theme-panel login-panel motion-pop w-full max-w-md p-5 shadow-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">Reset password</h2>
            <p className="mt-1 text-sm text-text-muted">
              Enter your username or email and we&apos;ll send a reset link.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <form className="app-modal-body space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-sm font-semibold text-text-control"
              htmlFor="resetIdentifier"
            >
              Username or email
            </label>
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              disabled={isSubmitting}
              id="resetIdentifier"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Username or email"
              value={identifier}
            />
          </div>

          {message && (
            <p
              className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success"
              role="status"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
