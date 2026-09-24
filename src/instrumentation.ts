export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startDirectorySyncScheduler } = await import(
    "@/domains/integrations/directory-sync-scheduler"
  );
  startDirectorySyncScheduler();
}
