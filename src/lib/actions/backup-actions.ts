"use server";

import { TenantBackupService } from "@/domains/operations/tenant-backup-service";
import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";

const tenantBackupService = new TenantBackupService();

export async function getTenantBackupOverview() {
  await requireSchoolSettingsManager();
  return tenantBackupService.getOverview();
}

export async function requestTenantBackup() {
  const currentUser = await requireSchoolSettingsManager();
  return tenantBackupService.requestBackup(currentUser);
}

export async function requestTenantRestore(input: {
  backupId: string;
  confirmation: string;
}) {
  const currentUser = await requireSchoolSettingsManager();
  return tenantBackupService.requestRestore(currentUser, input);
}
