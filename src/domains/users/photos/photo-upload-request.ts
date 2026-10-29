import { assertSameOriginRequest } from "@/lib/security/origin";
import { sessionService } from "@/lib/actions/action-auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { PhotoInputError } from "./photo-storage";

export async function authorisePhotoUpload() {
  await assertSameOriginRequest({ requireOrigin: true });
  const user = await sessionService.getCurrentUser();
  if (!user || user.role !== "admin") return null;
  const limit = await consumeRateLimit({
    key: `photo-upload:${user.id}`,
    maxAttempts: 10,
    windowMilliseconds: 60_000,
  });
  if (!limit.ok)
    throw new PhotoInputError(
      "Too many uploads. Please wait a minute and try again.",
    );
  return user;
}

export async function readPhotoForm(request: Request, maximumBytes: number) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new PhotoInputError("Choose a photo or ZIP file.");
  if (Number(request.headers.get("content-length") || 0) > maximumBytes)
    throw new PhotoInputError("The upload exceeds the size limit.");
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoInputError("The upload is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new PhotoInputError("The upload exceeds the size limit.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "content-type": request.headers.get("content-type")! },
  }).formData();
}

export function photoErrorResponse(error: unknown) {
  if (error instanceof PhotoInputError)
    return Response.json({ message: error.message }, { status: 400 });
  if (error instanceof Error && error.message === "Invalid request origin.")
    return Response.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  console.error(
    "Profile photo operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    {
      message:
        "Photo storage is temporarily unavailable. Please try again or contact support.",
    },
    { status: 503 },
  );
}
