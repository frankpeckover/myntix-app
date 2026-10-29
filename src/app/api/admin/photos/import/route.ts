import { sessionService } from "@/lib/actions/action-auth";
import {
  applyPhotoImport,
  maximumZipBytes,
  previewPhotoImport,
} from "@/domains/users/photos/photo-import-service";
import {
  isPhotoStorageConfigured,
  PhotoInputError,
} from "@/domains/users/photos/photo-storage";
import {
  authorisePhotoUpload,
  photoErrorResponse,
  readPhotoForm,
} from "@/domains/users/photos/photo-upload-request";

export const runtime = "nodejs";

export async function GET() {
  const user = await sessionService.getCurrentUser();
  if (user?.role !== "admin")
    return Response.json(
      { message: "Administrator access required." },
      { status: 403 },
    );
  return Response.json(
    { configured: isPhotoStorageConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const user = await authorisePhotoUpload();
    if (!user)
      return Response.json(
        { message: "Administrator access required." },
        { status: 403 },
      );
    if (!isPhotoStorageConfigured())
      throw new PhotoInputError(
        "Profile photo storage is not configured. Contact support.",
      );
    const data = await readPhotoForm(request, maximumZipBytes + 64 * 1024);
    const file = data.get("archive");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip"))
      throw new PhotoInputError("Choose a ZIP file.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const replace = data.get("replaceExisting") === "true";
    if (data.get("mode") === "apply") {
      const count = await applyPhotoImport(
        bytes,
        replace,
        String(data.get("digest") ?? ""),
        user.id,
      );
      return Response.json(
        { count },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { preview } = await previewPhotoImport(bytes, replace);
    return Response.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoErrorResponse(error);
  }
}
