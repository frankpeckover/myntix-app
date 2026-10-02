"use server";

import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";
import { OrganisationDeletionService } from "@/domains/organisation/organisation-deletion-service";

const service = new OrganisationDeletionService();

export async function requestOrganisationDeletion(input: { confirmation: string; reason: string }) {
  const currentUser = await requireSchoolSettingsManager();
  return service.request(currentUser, input.confirmation, input.reason);
}

