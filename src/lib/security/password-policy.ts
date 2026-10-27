export type PasswordPolicyResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export const minimumPasswordLength = 8;
export const maximumPasswordLength = 256;

export const passwordRequirementsText = `Use ${minimumPasswordLength}-${maximumPasswordLength} characters. A longer, unique passphrase is recommended.`;

export function validateNewPassword(password: string): PasswordPolicyResult {
  if (typeof password !== "string" || !password) {
    return {
      ok: false,
      message: "Enter a new password.",
    };
  }

  if (password.length < minimumPasswordLength) {
    return {
      ok: false,
      message: `New password must be at least ${minimumPasswordLength} characters.`,
    };
  }

  if (password.length > maximumPasswordLength) {
    return {
      ok: false,
      message: `New password must be ${maximumPasswordLength} characters or fewer.`,
    };
  }

  return { ok: true };
}

export function validateConfirmedPassword(
  password: string,
  confirmation: string,
): PasswordPolicyResult {
  const policy = validateNewPassword(password);
  if (!policy.ok) return policy;
  if (typeof confirmation !== "string" || !confirmation) {
    return { ok: false, message: "Confirm your new password." };
  }
  if (password !== confirmation) {
    return { ok: false, message: "New passwords do not match." };
  }
  return { ok: true };
}

export function isPasswordTooLong(password: string) {
  return password.length > maximumPasswordLength;
}
