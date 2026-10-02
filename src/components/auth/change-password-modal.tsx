"use client";

import { useState, type FormEvent } from "react";
import { changeOwnPassword } from "@/lib/actions";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { ModalShell } from "@/components/ui/modal-shell";

type ChangePasswordModalProps = {
  onClose: () => void;
};

export function ChangePasswordModal({
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);

    const result = await changeOwnPassword({
      currentPassword,
      newPassword,
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed.");
  }

  return (
    <ModalShell
      description="Update the password for your account."
      maxWidthClassName="max-w-md"
      onClose={onClose}
      title="Change Password"
    >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordField
            autoComplete="current-password"
            id="currentPassword"
            label="Current password"
            onChange={setCurrentPassword}
            value={currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            describedBy="newPasswordRequirements"
            id="newPassword"
            label="New password"
            onChange={setNewPassword}
            value={newPassword}
          />
          <PasswordRequirements id="newPasswordRequirements" />
          <PasswordField
            autoComplete="new-password"
            id="confirmPassword"
            label="Confirm new password"
            onChange={setConfirmPassword}
            value={confirmPassword}
          />

          {error && (
            <p
              className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
              role="alert"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success"
              role="status"
            >
              {message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Password"}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}

function PasswordField({
  autoComplete,
  describedBy,
  id,
  label,
  onChange,
  value,
}: {
  autoComplete: string;
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
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type="password"
        value={value}
      />
    </div>
  );
}
