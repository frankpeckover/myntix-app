import { sessionService } from "@/lib/actions/action-auth";
import { db } from "@/lib/database/db";
import { readProfilePhoto } from "@/domains/users/photos/photo-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    if (!/^[a-f0-9]{64}$/.test(id))
      return new Response(null, { status: 404, headers });
    const user = await sessionService.getCurrentUser();
    if (!user) return new Response(null, { status: 401, headers });
    const url = `/api/profile-images/${id}`;
    if (user.role === "student" && user.profileImageUrl !== url)
      return new Response(null, { status: 404, headers });
    if (user.role === "teacher") {
      const reference = await db.query(
        "select id from users where profile_image_url = $1 limit 1",
        [url],
      );
      if (!reference.rowCount)
        return new Response(null, { status: 404, headers });
    }
    const bytes = await readProfilePhoto(id);
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
