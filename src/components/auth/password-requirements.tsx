import { passwordRequirementsText } from "@/lib/security/password-policy";

export function PasswordRequirements({ id }: { id?: string }) {
  return (
    <p className="mt-1.5 text-xs text-text-muted" id={id}>
      {passwordRequirementsText}
    </p>
  );
}
