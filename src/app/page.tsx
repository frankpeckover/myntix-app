import { AppEntry } from "@/components/layout/app-entry";
import { TenantMaintenancePage } from "@/components/layout/tenant-maintenance-page";
import { getCurrentSessionUser } from "@/lib/actions";
import {
  assertCurrentTenantExists,
  TenantMaintenanceError,
  TenantNotFoundError,
} from "@/lib/database/db";
import { getActiveMaintenanceMessage } from "@/domains/operations/platform-announcement-service";
import { notFound } from "next/navigation";

export default async function Home({searchParams}:{searchParams:Promise<{returnTo?:string}>}) {
  try {
    await assertCurrentTenantExists();
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      notFound();
    }

    if (error instanceof TenantMaintenanceError) {
      return <TenantMaintenancePage message={error.userMessage} />;
    }

    throw error;
  }

  const currentUser = await getCurrentSessionUser();
  const maintenanceMessage = await getActiveMaintenanceMessage();
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
