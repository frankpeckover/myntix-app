"use client";

import { useState, type FormEvent } from "react";
import { resetUserPassword } from "@/lib/actions";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { validateConfirmedPassword } from "@/lib/security/password-policy";
import { ModalShell } from "@/components/ui/modal-shell";
import type { UserListItem } from "@/domains/users/user-service";

type ResetUserPasswordModalProps = {
  onClose: () => void;
  onReset: () => void;
  user: UserListItem;
};

export function ResetUserPasswordModal({
  onClose,
  onReset,
  user,
}: ResetUserPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const validation = validateConfirmedPassword(password, confirmPassword);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setIsSaving(true);

    let result;
    try {
      result = await resetUserPassword({
        id: user.id,
        password,
        confirmPassword,
      });
    } catch {
      setError("Could not reset password. Please try again.");
      return;
    } finally {
      setIsSaving(false);
    }

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    onReset();
  }

  return (
    <ModalShell
      description={`Set a new password for ${user.displayName}.`}
      maxWidthClassName="max-w-md"
      onClose={onClose}
      title="Reset Password"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <NewPasswordFields
          idPrefix="admin-reset-password"
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          disabled={isSaving}
        />

        {error && (
          <p
            className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
