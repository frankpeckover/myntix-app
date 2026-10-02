"use client";

import { useState, type FormEvent } from "react";
import { completePasswordReset } from "@/lib/actions";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { appConfig } from "@/lib/config/app-config";

type ResetPasswordCardProps = {
  token: string;
};

export function ResetPasswordCard({ token }: ResetPasswordCardProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const result = await completePasswordReset({
      newPassword,
      token,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Password reset. You can now return to the login screen.");
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  }

  return (
    <main
      className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8"
      id="main-content"
      tabIndex={-1}
    >
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-md content-center">
        <section className="theme-panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            {appConfig.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Reset password</h1>
          <p className="mt-2 text-sm text-text-muted">
            Choose a new password for your account.
          </p>

          {!token && (
            <p className="mt-5 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              This reset link is missing a token.
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              describedBy="resetPasswordRequirements"
              id="newPassword"
              label="New password"
              onChange={setNewPassword}
              value={newPassword}
            />
            <PasswordRequirements id="resetPasswordRequirements" />
            <PasswordField
              id="confirmPassword"
              label="Confirm password"
              onChange={setConfirmPassword}
              value={confirmPassword}
            />

            {message && (
              <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
                {error}
              </p>
            )}

            <button
              className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || !token}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Reset password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function PasswordField({
  describedBy,
  id,
  label,
  onChange,
  value,
}: {
  describedBy?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        autoComplete="new-password"
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type="password"
        value={value}
      />
    </div>
  );
}
