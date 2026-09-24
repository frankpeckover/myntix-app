"use server";

import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";
import type { UpdateTassSyncSettingsInput } from "@/domains/integrations/directory-sync-types";
import { DirectorySyncService } from "@/domains/integrations/directory-sync-service";

const directorySyncService = new DirectorySyncService();

export async function getTassSyncSettings() {
  await requireSchoolSettingsManager();
  return directorySyncService.getTassSettings();
}

export async function updateTassSyncSettings(input: UpdateTassSyncSettingsInput) {
  const currentUser = await requireSchoolSettingsManager();
  return directorySyncService.updateTassSettings(currentUser, input);
}

export async function testTassSyncConnection() {
  await requireSchoolSettingsManager();
  return directorySyncService.testTassConnection();
}

export async function runTassSync() {
  const currentUser = await requireSchoolSettingsManager();
  return directorySyncService.runTassSync(currentUser);
}
