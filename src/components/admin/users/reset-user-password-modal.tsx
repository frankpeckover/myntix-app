"use client";

import { useState, type FormEvent } from "react";
import { resetUserPassword } from "@/lib/actions";
import { PasswordRequirements } from "@/components/auth/password-requirements";
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
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const result = await resetUserPassword({ id: user.id, password });

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
          <div>
            <label className="text-sm font-semibold text-text-control" htmlFor="resetUserPassword">
              New password
            </label>
            <input
              aria-describedby="resetUserPasswordRequirements"
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              id="resetUserPassword"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <PasswordRequirements id="resetUserPasswordRequirements" />
          </div>

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong" role="alert">
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
