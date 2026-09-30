import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getRequiredServerEnvInProduction } from "@/lib/config/server-env";

const algorithm = "aes-256-gcm";
const encryptionKeyFallback = "development-only-sso-secret-key";
const ivLengthBytes = 12;
const authTagLengthBytes = 16;

export function encryptServerSecret(value: string) {
  const iv = randomBytes(ivLengthBytes);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptServerSecret(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, ivLengthBytes);
  const authTag = payload.subarray(ivLengthBytes, ivLengthBytes + authTagLengthBytes);
  const encrypted = payload.subarray(ivLengthBytes + authTagLengthBytes);
  const decipher = createDecipheriv(algorithm, getEncryptionKey(), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  const secret = getRequiredServerEnvInProduction(
    "SSO_SECRET_ENCRYPTION_KEY",
    encryptionKeyFallback,
  );

  return createHash("sha256").update(secret).digest();
}

