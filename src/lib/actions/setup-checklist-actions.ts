"use server";

import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";
import {
  SetupChecklistService,
  type SetupChecklistStepKey,
} from "@/domains/organisation/setup-checklist-service";

const setupChecklistService = new SetupChecklistService();

export async function getSetupChecklist() {
  const currentUser = await requireSchoolSettingsManager();
  return setupChecklistService.getSummary(currentUser.id);
}

export async function setSetupChecklistDismissed(isDismissed: boolean) {
  const currentUser = await requireSchoolSettingsManager();
  await setupChecklistService.setDismissed(currentUser.id, isDismissed);
  return { ok: true as const };
}

export async function completeSetupChecklistStep(
  stepKey: SetupChecklistStepKey,
) {
  const currentUser = await requireSchoolSettingsManager();
  await setupChecklistService.completeStep(currentUser.id, stepKey);
  return { ok: true as const };
}
