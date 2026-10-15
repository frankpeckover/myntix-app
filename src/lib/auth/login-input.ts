import { maximumPasswordLength } from "@/lib/security/password-policy";

export const maximumLoginIdentifierLength = 256;

export function normaliseLoginIdentifier(value: unknown): string | null {
  if (typeof value !== "string" || value.length > maximumLoginIdentifierLength) return null;
  const identifier = value.trim().toLowerCase();
  if (!identifier || /[\u0000-\u001f\u007f]/.test(identifier)) return null;
  return identifier;
}

export function validateLoginInput(username: unknown, password: unknown) {
  const identifier = normaliseLoginIdentifier(username);
  if (!identifier || typeof password !== "string" || !password || password.length > maximumPasswordLength) {
    return null;
  }
  return { username: identifier, password };
}
