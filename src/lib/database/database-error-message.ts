export function getDatabaseErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code === "42P01" || message.includes("does not exist")) {
    return "The database schema is not set up. Run the school database setup script, then try again.";
  }

  if (code === "42501" || message.includes("permission denied")) {
    return "The database user does not have enough permissions for this action.";
  }

  if (code === "23505") {
    return "This record already exists.";
  }

  if (code === "23503") {
    return "A related record is missing, so this change could not be saved.";
  }

  return fallbackMessage;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }

  return "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
