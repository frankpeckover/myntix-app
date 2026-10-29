import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getCurrentTenantSlug } from "@/lib/database/db";

export const maximumPhotoBytes = 2 * 1024 * 1024;
const storageKeys = [
  "PHOTO_STORAGE_ENDPOINT",
  "PHOTO_STORAGE_BUCKET",
  "PHOTO_STORAGE_ACCESS_KEY_ID",
  "PHOTO_STORAGE_SECRET_ACCESS_KEY",
] as const;

export class PhotoInputError extends Error {}
let storage: { bucket: string; client: S3Client } | undefined;

export function isPhotoStorageConfigured() {
  return storageKeys.every((key) => Boolean(process.env[key]?.trim()));
}

function getStorage() {
  if (storage) return storage;
  if (!isPhotoStorageConfigured())
    throw new PhotoInputError(
      "Profile photo storage is not configured. Contact support.",
    );
  const endpoint = new URL(process.env.PHOTO_STORAGE_ENDPOINT!);
  if (endpoint.protocol !== "https:")
    throw new Error("Photo storage must use HTTPS.");
  storage = {
    bucket: process.env.PHOTO_STORAGE_BUCKET!,
    client: new S3Client({
      endpoint: endpoint.href,
      region: process.env.PHOTO_STORAGE_REGION?.trim() || "auto",
      credentials: {
        accessKeyId: process.env.PHOTO_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.PHOTO_STORAGE_SECRET_ACCESS_KEY!,
      },
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 15_000 },
    }),
  };
  return storage;
}

export async function prepareProfilePhoto(bytes: Buffer): Promise<Buffer> {
  if (!bytes.length || bytes.length > maximumPhotoBytes)
    throw new PhotoInputError("Each photo must be 2 MB or smaller.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !["png", "jpeg", "webp", "gif"].includes(metadata.format)
    ) {
      throw new PhotoInputError("Choose a PNG, JPG, WebP or GIF image.");
    }
    // Re-encoding strips EXIF/GPS metadata and only keeps the first animation frame.
    return await image
      .rotate()
      .resize(256, 256, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    if (error instanceof PhotoInputError) throw error;
    throw new PhotoInputError(
      "The photo could not be read as a supported image.",
    );
  }
}

export async function storePreparedProfilePhoto(bytes: Buffer) {
  const write = await createProfilePhotoWriter();
  return write(bytes);
}

export async function createProfilePhotoWriter() {
  const tenant = await getCurrentTenantSlug();
  const { client, bucket } = getStorage();
  return async (bytes: Buffer) => {
    const id = createHash("sha256").update(bytes).digest("hex");
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `tenants/${tenant}/profiles/${id}.webp`,
        Body: bytes,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
    );
    return `/api/profile-images/${id}`;
  };
}

export async function readProfilePhoto(id: string) {
  const tenant = await getCurrentTenantSlug();
  const { client, bucket } = getStorage();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: `tenants/${tenant}/profiles/${id}.webp`,
    }),
  );
  if (!object.Body || (object.ContentLength ?? 0) > maximumPhotoBytes)
    throw new Error("Invalid stored photo.");
  return object.Body.transformToByteArray();
}
