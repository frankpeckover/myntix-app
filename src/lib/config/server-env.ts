export function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredServerEnvInProduction(
  name: string,
  developmentFallback: string,
) {
  if (process.env.NODE_ENV !== "production") {
    return process.env[name]?.trim() || developmentFallback;
  }

  return getRequiredServerEnv(name);
}

export function getServerEnvNumber(name: string, fallback: number) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return parsedValue;
}
