import {
  maximumPhotoBytes,
  prepareProfilePhoto,
  storePreparedProfilePhoto,
} from "@/domains/users/photos/photo-storage";
import {
  authorisePhotoUpload,
  photoErrorResponse,
  readPhotoForm,
} from "@/domains/users/photos/photo-upload-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await authorisePhotoUpload()))
      return Response.json(
        { message: "Administrator access required." },
        { status: 403 },
      );
    const data = await readPhotoForm(request, maximumPhotoBytes + 64 * 1024);
    const file = data.get("image");
    if (!(file instanceof File))
      return Response.json({ message: "Choose a photo." }, { status: 400 });
    const bytes = await prepareProfilePhoto(
      Buffer.from(await file.arrayBuffer()),
    );
    return Response.json(
      { ok: true, imageUrl: await storePreparedProfilePhoto(bytes) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoErrorResponse(error);
  }
}
