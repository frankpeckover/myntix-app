export const maximumApiBodyBytes = 16 * 1024;

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function readApiJsonBody(request: Request): Promise<string> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (request.body && contentType !== "application/json") {
    throw new ApiRequestError(
      "unsupported_media_type",
      "Request bodies must use application/json.",
      415,
    );
  }
  const encoding = request.headers
    .get("content-encoding")
    ?.trim()
    .toLowerCase();
  if (encoding && encoding !== "identity") {
    throw new ApiRequestError(
      "unsupported_media_type",
      "Compressed request bodies are not supported.",
      415,
    );
  }
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength &&
    (!/^\d+$/.test(declaredLength) ||
      Number(declaredLength) > maximumApiBodyBytes)
  ) {
    throw new ApiRequestError(
      "payload_too_large",
      "Request body cannot exceed 16 KiB.",
      413,
    );
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumApiBodyBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ApiRequestError(
          "payload_too_large",
          "Request body cannot exceed 16 KiB.",
          413,
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(
      "invalid_json",
      "Request body must be valid UTF-8 JSON.",
      400,
    );
  } finally {
    reader.releaseLock();
  }
}
