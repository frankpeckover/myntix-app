"use server";

import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";
import type { ActionResult } from "@/lib/actions/action-results";
import type { ApiScope } from "@/lib/api/api-types";
import { AuditService } from "@/domains/audit/audit-service";
import {
  ApiClientService,
  ApiClientValidationError,
} from "@/domains/integrations/api-client-service";

type CreateApiClientActionInput = {
  name: string;
  scopes: ApiScope[];
};

const apiClientService = new ApiClientService();
const auditService = new AuditService();

export async function listApiClients() {
  await requireSchoolSettingsManager();
  return apiClientService.listClients();
}

export async function createApiClient(
  input: CreateApiClientActionInput,
): Promise<ActionResult & { apiKey?: string }> {
  const currentUser = await requireSchoolSettingsManager();

  try {
    const result = await apiClientService.createClient(input);

    await auditService.log({
      action: "api_client.created",
      actorUserId: currentUser.id,
      details: {
        keyPrefix: result.client.keyPrefix,
        name: result.client.name,
        scopes: result.client.scopes,
      },
      entityId: result.client.id,
      entityType: "api_client",
    });

    return {
      apiKey: result.apiKey,
      message: "API key created.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getApiClientErrorMessage(error),
      ok: false,
    };
  }
}

export async function setApiClientActive(
  clientId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const currentUser = await requireSchoolSettingsManager();

  try {
    const client = await apiClientService.setClientActive(clientId, isActive);

    await auditService.log({
      action: isActive ? "api_client.enabled" : "api_client.disabled",
      actorUserId: currentUser.id,
      details: {
        keyPrefix: client.keyPrefix,
        name: client.name,
      },
      entityId: client.id,
      entityType: "api_client",
    });

    return {
      message: isActive ? "API key enabled." : "API key disabled.",
      ok: true,
    };
  } catch (error) {
    return {
      message: getApiClientErrorMessage(error),
      ok: false,
    };
  }
}

function getApiClientErrorMessage(error: unknown) {
  if (error instanceof ApiClientValidationError) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "An API key with that name already exists.";
  }
  console.error("Could not save API key settings", error);
  return "Could not save API key settings.";
}
