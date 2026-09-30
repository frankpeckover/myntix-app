import { createHmac } from "crypto";
import { getRequiredServerEnvInProduction } from "@/lib/config/server-env";

const developmentHashSecret = "development-only-hash-secret";

export function hashServerSecret(value: string, envName: string) {
  const secret = getRequiredServerEnvInProduction(
    envName,
    developmentHashSecret,
  );

  return createHmac("sha256", secret).update(value).digest("hex");
}
