import { PasswordRequirements } from "@/components/auth/password-requirements";
import {
  minimumPasswordLength,
  maximumPasswordLength,
} from "@/lib/security/password-policy";

type PasswordFieldProps = {
  autoComplete?: "current-password" | "new-password";
  describedBy?: string;
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

export function PasswordField({
  autoComplete = "new-password",
  describedBy,
  disabled = false,
  id,
  invalid,
  label,
  onChange,
  value,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm text-text-control outline-none ring-brand transition focus:ring-2"
        disabled={disabled}
        id={id}
        name={id}
        minLength={
          autoComplete === "new-password" ? minimumPasswordLength : undefined
        }
        maxLength={maximumPasswordLength}
        onChange={(event) => onChange(event.target.value)}
        required
        type="password"
        value={value}
      />
    </div>
  );
}

export function NewPasswordFields({
  idPrefix,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false,
}: {
  idPrefix: string;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  disabled?: boolean;
}) {
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const requirementsId = `${idPrefix}-requirements`;
  const mismatchId = `${idPrefix}-mismatch`;
  return (
    <>
      <PasswordField
        describedBy={requirementsId}
        disabled={disabled}
        id={`${idPrefix}-password`}
        label="New password"
        onChange={onPasswordChange}
        value={password}
      />
      <PasswordRequirements id={requirementsId} />
      <PasswordField
        describedBy={mismatch ? mismatchId : undefined}
        disabled={disabled}
        id={`${idPrefix}-confirmation`}
        invalid={mismatch}
        label="Confirm new password"
        onChange={onConfirmPasswordChange}
        value={confirmPassword}
      />
      {mismatch && (
        <p className="text-sm text-danger-strong" id={mismatchId} role="status">
          New passwords do not match.
        </p>
      )}
    </>
  );
}
