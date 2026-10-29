import { createHash } from "node:crypto";
import { fromBuffer, type Entry, type ZipFile } from "yauzl";
import { db } from "@/lib/database/db";
import { hasSchoolProfilePhoto } from "@/lib/theme/avatar-config";
import { AuditService } from "@/domains/audit/audit-service";
import {
  createProfilePhotoWriter,
  maximumPhotoBytes,
  PhotoInputError,
  prepareProfilePhoto,
} from "./photo-storage";
import type { PhotoImportPreview, PhotoImportRow } from "./photo-import-types";

export const maximumZipBytes = 25 * 1024 * 1024;
const maximumEntries = 500;
const maximumExpandedBytes = 100 * 1024 * 1024;
type MatchedPhoto = {
  id: string;
  previousUrl: string;
  bytes: Buffer;
  row: PhotoImportRow;
};

export async function previewPhotoImport(
  archive: Buffer,
  replaceExisting: boolean,
) {
  const entries = await readPhotoZip(archive);
  if (!entries.length) throw new PhotoInputError("The ZIP contains no photos.");
  const usernameFor = (name: string) =>
    name.replace(/\.(png|jpe?g|webp|gif)$/i, "").toLowerCase();
  const users = await db.query<{
    id: string;
    username: string;
    profile_image_url: string;
  }>(
    `select users.id, username, profile_image_url from users join roles on roles.id = users.role_id
     where roles.role_key = 'student' and lower(username) = any($1::text[])`,
    [entries.map((entry) => usernameFor(entry.name))],
  );
  const byUsername = new Map<string, typeof users.rows>();
  for (const user of users.rows) {
    const key = user.username.toLowerCase();
    byUsername.set(key, [...(byUsername.get(key) ?? []), user]);
  }
  const nameCounts = new Map<string, number>();
  for (const entry of entries) {
    const name = usernameFor(entry.name);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const rows: PhotoImportRow[] = [];
  const matches: MatchedPhoto[] = [];
  for (const entry of entries) {
    const username = usernameFor(entry.name);
    const row: PhotoImportRow = {
      fileName: entry.name,
      username,
      status: "skipped",
      message: "",
    };
    rows.push(row);
    const candidates = byUsername.get(username) ?? [];
    if (nameCounts.get(username)! > 1)
      row.message =
        "Duplicate filename for this username; all duplicates skipped.";
    else if (candidates.length !== 1)
      row.message = candidates.length
        ? "Ambiguous username; skipped."
        : "No student has this username.";
    else if (hasSchoolProfilePhoto(candidates[0].profile_image_url) && !replaceExisting)
      row.message = "Already has a photo. Enable replacement to update it.";
    else {
      try {
        const bytes = await prepareProfilePhoto(entry.bytes);
        row.status = "ready";
        row.message = hasSchoolProfilePhoto(candidates[0].profile_image_url)
          ? "Replace existing photo"
          : "Add photo";
        matches.push({
          id: candidates[0].id,
          previousUrl: candidates[0].profile_image_url,
          bytes,
          row,
        });
      } catch (error) {
        row.status = "invalid";
        row.message =
          error instanceof PhotoInputError ? error.message : "Invalid photo.";
      }
    }
  }
  const digest = createHash("sha256")
    .update(archive)
    .update(
      JSON.stringify(matches.map(({ id, previousUrl }) => [id, previousUrl])),
    )
    .update(String(replaceExisting))
    .digest("hex");
  const preview: PhotoImportPreview = {
    digest,
    rows,
    readyCount: matches.length,
  };
  return { preview, matches };
}

export async function applyPhotoImport(
  archive: Buffer,
  replaceExisting: boolean,
  expectedDigest: string,
  actorId: string,
) {
  const { preview, matches } = await previewPhotoImport(
    archive,
    replaceExisting,
  );
  if (!expectedDigest || expectedDigest !== preview.digest)
    throw new PhotoInputError(
      "The file or student records changed. Preview the ZIP again before importing.",
    );
  if (!matches.length)
    throw new PhotoInputError("There are no matched photos to import.");
  // Upload first, then commit the references together. A failed upload never leaves a half-updated user list.
  const uploaded: { id: string; previousUrl: string; url: string }[] = [];
  const writePhoto = await createProfilePhotoWriter();
  for (let index = 0; index < matches.length; index += 4) {
    uploaded.push(
      ...(await Promise.all(
        matches.slice(index, index + 4).map(async (photo) => ({
          id: photo.id,
          previousUrl: photo.previousUrl,
          url: await writePhoto(photo.bytes),
        })),
      )),
    );
  }
  const client = await db.connect();
  try {
    await client.query("begin");
    for (const photo of uploaded) {
      const result = await client.query(
        "update users set profile_image_url = $1, updated_at = now() where id = $2 and profile_image_url = $3 and role_id = (select id from roles where role_key = 'student') returning id",
        [photo.url, photo.id, photo.previousUrl],
      );
      if (!result.rowCount)
        throw new PhotoInputError(
          "A student's photo changed during import. Preview again.",
        );
    }
    await new AuditService().logWithClient(client, {
      action: "users.photos_imported",
      actorUserId: actorId,
      entityType: "user",
      details: { count: uploaded.length, replaceExisting },
    });
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return uploaded.length;
}

async function readPhotoZip(
  bytes: Buffer,
): Promise<{ name: string; bytes: Buffer }[]> {
  if (!bytes.length || bytes.length > maximumZipBytes)
    throw new PhotoInputError("Choose a ZIP file up to 25 MB.");
  const zip = await new Promise<ZipFile>((resolve, reject) =>
    fromBuffer(
      bytes,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) =>
        error
          ? reject(new PhotoInputError("The ZIP is damaged or unsupported."))
          : resolve(zip!),
    ),
  );
  return new Promise((resolve, reject) => {
    const photos: { name: string; bytes: Buffer }[] = [];
    let count = 0;
    let totalBytes = 0;
    let stopped = false;
    const fail = (error: unknown) => {
      if (stopped) return;
      stopped = true;
      zip.close();
      reject(
        error instanceof PhotoInputError
          ? error
          : new PhotoInputError("The ZIP is damaged or unsupported."),
      );
    };
    zip.on("error", fail);
    zip.on("end", () => {
      if (!stopped) {
        stopped = true;
        resolve(photos);
      }
    });
    zip.on("entry", (entry: Entry) => {
      count += 1;
      if (count > maximumEntries)
        return fail(
          new PhotoInputError(
            "A ZIP may contain at most 500 entries. Split larger batches.",
          ),
        );
      const name = entry.fileName;
      // Never extract to disk; reject nested paths, links, encryption and unsupported formats.
      const fileType = (entry.externalFileAttributes >>> 16) & 0xf000;
      if (
        name.endsWith("/") ||
        name.startsWith("__MACOSX/") ||
        name === ".DS_Store"
      ) {
        zip.readEntry();
        return;
      }
      if (
        name.includes("/") ||
        name.includes("\\") ||
        name.includes("\0") ||
        fileType === 0xa000 ||
        entry.generalPurposeBitFlag & 1 ||
        !/^[^/\\]+\.(png|jpe?g|webp|gif)$/i.test(name)
      ) {
        return fail(
          new PhotoInputError(
            "Use only JPG, PNG, WebP or GIF files at the root of the ZIP; no folders or links.",
          ),
        );
      }
      totalBytes += entry.uncompressedSize;
      if (
        entry.uncompressedSize > maximumPhotoBytes ||
        totalBytes > maximumExpandedBytes
      )
        return fail(
          new PhotoInputError(
            "Each photo must be at most 2 MB, with at most 100 MB uncompressed per ZIP.",
          ),
        );
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) return fail(error);
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maximumPhotoBytes) {
            stream.destroy();
            fail(new PhotoInputError("A photo exceeds the size limit."));
          } else chunks.push(chunk);
        });
        stream.on("error", fail);
        stream.on("end", () => {
          if (!stopped) {
            photos.push({ name, bytes: Buffer.concat(chunks) });
            zip.readEntry();
          }
        });
      });
    });
    zip.readEntry();
  });
}
