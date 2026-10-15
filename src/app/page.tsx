import { AppEntry } from "@/components/layout/app-entry";
import { TenantMaintenancePage } from "@/components/layout/tenant-maintenance-page";
import { getCurrentSessionUser } from "@/lib/actions";
import {
  assertCurrentTenantExists,
  TenantMaintenanceError,
  TenantNotFoundError,
} from "@/lib/database/db";
import { getActiveMaintenanceMessage } from "@/domains/operations/platform-announcement-service";
import { UserPreferenceService } from "@/domains/users/user-preference-service";
import type { UserPreferences } from "@/lib/theme/user-preferences";
import { notFound } from "next/navigation";
import { getSafeReturnPath } from "@/lib/security/return-path";

const userPreferenceService = new UserPreferenceService();

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
  let initialPreferences: UserPreferences | null = null;
  if (currentUser) {
    try {
      initialPreferences = await userPreferenceService.getPreferences(currentUser);
    } catch (error) {
      console.error("Load initial user preferences failed", error);
    }
  }
  const maintenanceMessage = await getActiveMaintenanceMessage();
  const requestedReturnTo=(await searchParams).returnTo;
  const returnTo = getSafeReturnPath(requestedReturnTo);

  return (
    <AppEntry
      initialUser={currentUser}
      initialPreferences={initialPreferences}
      maintenanceMessage={maintenanceMessage}
      returnTo={returnTo}
    />
  );
}
