import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api/api-response";
import type {
  ApiClient,
  ApiFailure,
  ApiScope,
  ApiSuccess,
} from "@/lib/api/api-types";
import {
  ApiIdempotencyService,
  getIdempotencyKey,
  hashApiRequest,
} from "@/domains/integrations/api-idempotency-service";
import { ApiClientService } from "@/domains/integrations/api-client-service";
import { ApiAuthenticationError } from "@/domains/integrations/api-client-service";
import { ApiFinanceError } from "@/domains/integrations/api-finance-service";

export type ApiJsonBody = Record<string, unknown>;

export type ApiRouteResult<T = unknown> = {
  body: ApiFailure | ApiSuccess<T>;
  status: number;
};

type ApiReadHandler<T> = (
  apiClient: ApiClient,
) => Promise<ApiRouteResult<T>>;

type ApiWriteHandler<T> = (
  apiClient: ApiClient,
  body: ApiJsonBody,
) => Promise<ApiRouteResult<T>>;

const apiClientService = new ApiClientService();
const apiIdempotencyService = new ApiIdempotencyService();

export function apiSuccessResult<T>(
  data: T,
  status = 200,
): ApiRouteResult<T> {
  return {
    body: {
      data,
      ok: true,
    },
    status,
  };
}

export function apiErrorResult(
  code: string,
  message: string,
  status = 400,
): ApiRouteResult {
  return {
    body: {
      error: {
        code,
        message,
      },
      ok: false,
    },
    status,
  };
}

export async function handleApiRead<T>(
  request: Request,
  requiredScope: ApiScope,
  handler: ApiReadHandler<T>,
) {
  const requestContext = createRequestContext();

  try {
    const apiClient = await authenticateApiClient(request, requiredScope);
    requestContext.apiClient = apiClient;

    const result = await handler(apiClient);

    return finishRequest(request, requestContext, toApiResponse(result));
  } catch (error) {
    if (error instanceof ApiAuthenticationError || error instanceof ApiFinanceError) {
      return finishRequest(
        request,
        requestContext,
        apiError(error.code, error.message, error.status),
      );
    }

    console.error("API read request failed", error);

    return finishRequest(
      request,
      requestContext,
      apiError("server_error", "The API request could not be completed.", 500),
    );
  }
}

export async function handleApiWrite<T>(
  request: Request,
  requiredScope: ApiScope,
  handler: ApiWriteHandler<T>,
) {
  const requestContext = createRequestContext();

  try {
    const apiClient = await authenticateApiClient(request, requiredScope);
    requestContext.apiClient = apiClient;

    const bodyText = await request.text();
    const bodyResult = parseJsonBody(bodyText);

    if (!bodyResult.ok) {
      return finishRequest(
        request,
        requestContext,
        toApiResponse(bodyResult.result),
      );
    }

    const idempotencyKey = getIdempotencyKey(request);

    if (!idempotencyKey) {
      return finishRequest(
        request,
        requestContext,
        apiError(
          "idempotency_key_required",
          "Write requests require an Idempotency-Key header.",
          400,
        ),
      );
    }
    requestContext.idempotencyKey = idempotencyKey;

    const requestHash = hashApiRequest(request, bodyText);
    const idempotencyResult = await apiIdempotencyService.reserve(
      apiClient.id,
      idempotencyKey,
      requestHash,
    );

    if (idempotencyResult.type === "cached") {
      return finishRequest(
        request,
        requestContext,
        NextResponse.json(idempotencyResult.responseBody, {
          status: idempotencyResult.statusCode,
        }),
      );
    }

    if (idempotencyResult.type === "conflict") {
      return finishRequest(
        request,
        requestContext,
        apiError(
          "idempotency_conflict",
          "This Idempotency-Key was already used for a different request.",
          409,
        ),
      );
    }

    if (idempotencyResult.type === "in_progress") {
      return finishRequest(
        request,
        requestContext,
        apiError(
          "request_in_progress",
          "A request with this Idempotency-Key is still in progress.",
          409,
        ),
      );
    }

    let result: ApiRouteResult<T>;

    try {
      result = await handler(apiClient, bodyResult.body);
    } catch (error) {
      await apiIdempotencyService.abandon(
        apiClient.id,
        idempotencyKey,
        requestHash,
      );
      throw error;
    }

    await apiIdempotencyService.complete(
      apiClient.id,
      idempotencyKey,
      requestHash,
      result.status,
      result.body,
    );

    return finishRequest(request, requestContext, toApiResponse(result));
  } catch (error) {
    if (error instanceof ApiAuthenticationError || error instanceof ApiFinanceError) {
      return finishRequest(
        request,
        requestContext,
        apiError(error.code, error.message, error.status),
      );
    }

    console.error("API write request failed", error);

    return finishRequest(
      request,
      requestContext,
      apiError("server_error", "The API request could not be completed.", 500),
    );
  }
}

function toApiResponse<T>(result: ApiRouteResult<T>) {
  return NextResponse.json(result.body, { status: result.status });
}

async function authenticateApiClient(
  request: Request,
  requiredScope: ApiScope,
) {
  return apiClientService.authenticate(
    request.headers.get("authorization"),
    requiredScope,
  );
}

function parseJsonBody(
  bodyText: string,
): { body: ApiJsonBody; ok: true } | { ok: false; result: ApiRouteResult } {
  try {
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        ok: false,
        result: apiErrorResult("invalid_json", "Request body must be a JSON object."),
      };
    }

    return { body: body as ApiJsonBody, ok: true };
  } catch {
    return {
      ok: false,
      result: apiErrorResult("invalid_json", "Request body is not valid JSON."),
    };
  }
}

type RequestContext = {
  apiClient: ApiClient | null;
  idempotencyKey: string | null;
  requestId: string;
  startedAt: number;
};

function createRequestContext(): RequestContext {
  return {
    apiClient: null,
    idempotencyKey: null,
    requestId: randomUUID(),
    startedAt: Date.now(),
  };
}

async function finishRequest(
  request: Request,
  context: RequestContext,
  response: NextResponse,
) {
  response.headers.set("X-Request-Id", context.requestId);

  try {
    await db.query(
      `
        insert into api_request_log (
          request_id, client_id, method, path, status_code,
          idempotency_key, duration_ms
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        context.requestId,
        context.apiClient?.id ?? null,
        request.method,
        new URL(request.url).pathname,
        response.status,
        context.idempotencyKey,
        Date.now() - context.startedAt,
      ],
    );
  } catch (error) {
    console.error("Could not record API request", error);
  }

  return response;
}
