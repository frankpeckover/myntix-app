import { AppEntry } from "@/components/app-entry";
import { getCurrentSessionUser } from "@/lib/actions";
import { assertCurrentTenantExists, TenantNotFoundError } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function Home({searchParams}:{searchParams:Promise<{returnTo?:string}>}) {
  try {
    await assertCurrentTenantExists();
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      notFound();
    }

    throw error;
  }

  const currentUser = await getCurrentSessionUser();
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE?.trim() ?? "";
  const requestedReturnTo=(await searchParams).returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") ? requestedReturnTo : null;

  return (
    <AppEntry
      initialUser={currentUser}
      maintenanceMessage={maintenanceMessage}
      returnTo={returnTo}
    />
  );
}
