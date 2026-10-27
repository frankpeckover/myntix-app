"use client";

import { useState, type FormEvent } from "react";
import { changeOwnPassword } from "@/lib/actions";
import {
  NewPasswordFields,
  PasswordField,
} from "@/components/auth/new-password-fields";
import { validateConfirmedPassword } from "@/lib/security/password-policy";
import { ModalShell } from "@/components/ui/modal-shell";

type ChangePasswordModalProps = {
  onClose: () => void;
};

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
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

    const validation = validateConfirmedPassword(newPassword, confirmPassword);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setIsSaving(true);

    let result;
    try {
      result = await changeOwnPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
    } catch {
      setError("Could not change password. Please try again.");
      return;
    } finally {
      setIsSaving(false);
    }

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
          disabled={isSaving}
          id="currentPassword"
          label="Current password"
          onChange={setCurrentPassword}
          value={currentPassword}
        />
        <NewPasswordFields
          idPrefix="change-password"
          disabled={isSaving}
          password={newPassword}
          confirmPassword={confirmPassword}
          onPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
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
