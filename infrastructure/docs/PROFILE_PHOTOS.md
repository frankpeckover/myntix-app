# Optional profile photos

## Preset avatars

Students can choose from 11 bundled robot avatars or initials in Preferences >
Profile avatar. The choice is saved in the existing user preferences JSONB;
no additional database migration, storage bucket or external avatar API is
needed. Static presets contain no student information and are safe to serve
publicly. Artwork is Bottts Neutral (DiceBear 9.4.2), based on Bottts by Pablo
Stanley; source/design licensing is included in `public/avatars/LICENSE.txt`.

School-uploaded or TASS photos take precedence. Students cannot replace those
photos through preferences. Removing a school photo restores the student's
saved avatar (or initials). Staff lists use the same shared profile image
reference. ZIP imports can replace a preset without enabling Replace existing
photos, since a preset is not a school photo. Initials remain the default and
can be reselected at any time. No image is uploaded when choosing a preset.

Students cannot upload photos. Initials remain the default. Admins can upload a
single photo in Create/Edit User, or use Users > table tools > Import student
photos: ZIP. ZIP import is for existing students only; it never creates users.

## Storage setup

Use a separate private S3-compatible bucket (for example Cloudflare R2). Disable
public access, public domains and public development URLs. Use a bucket-scoped
Object Read & Write token; never put credentials in `NEXT_PUBLIC_*` variables or
reuse the backup encryption key. Add these values to the app environment:

```dotenv
PHOTO_STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
PHOTO_STORAGE_BUCKET=myntix-profile-photos
PHOTO_STORAGE_ACCESS_KEY_ID=YOUR_ACCESS_KEY
PHOTO_STORAGE_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
PHOTO_STORAGE_REGION=auto
```

Restart the app after changing its environment. Without configuration, login,
ledger and initials continue to work; photo uploads report that storage needs
configuration. Bucket location is a deployment decision: verify the provider's
residency guarantees before promising Australian-only storage to a school.

Images are decoded, oriented, cropped to at most 256x256, re-encoded to WebP and
stripped of metadata. SVG and other formats are rejected. Keys use tenant slug
and a content hash, not student names. Browsers access an authenticated app
endpoint, never public bucket URLs. Staff can see photos within their own tenant;
students can see only their own photo. Responses are private and not cached.

## ZIP import

Put `username.jpg` (or PNG/WebP/GIF) files directly at the archive root. Matching
is case-insensitive against usernames in the current organisation, not names or
emails. Duplicate or ambiguous names are skipped, never guessed. Preview before
confirmation. Existing images are kept unless Replace existing student photos is
checked. The server repeats validation at confirmation and rejects stale matches.

Limits: 25 MB compressed, 100 MB uncompressed, 500 entries, 2 MB per image and
20 million decoded pixels. Upload smaller batches if your proxy has a lower
request-size/time limit. ZIPs are never extracted to disk; nested image paths,
symlinks, encrypted files and unsupported files are rejected. Imports are audited.

## TASS

Apply `infrastructure/database/tenant/13-profile-photos.sql` to every existing
tenant using its schema first in `search_path`. New installs also get the default
from `09-directory-sync.sql`. In Admin Settings > TASS enable Sync profile photos
(off by default), save, then sync. It requests thumbnail photos from the existing
LMS Integration API (`student_photo.file_info.image` and
`teacher_photo.file_info.image`, Base64). TASS must permit photo access. Available
TASS photos replace manually uploaded photos on subsequent syncs. Missing photos
do not erase existing photos; invalid/unavailable images are counted separately
without blocking the roster. Disable photo sync to keep manual photos authoritative.

## Backups and existing photos

Photo bytes are intentionally **not backed up**. Database backups still contain
the URL references. Restore does not restore or rewind the bucket: a missing
image falls back to initials, and can be re-imported or fetched again from TASS.
Keep the school's original ZIP if it needs to re-import later.

Older images already in `public/uploads/users` are not automatically moved or
deleted; their existing URLs continue working. Re-upload them to use private
storage, then remove the old public copies after checking they are no longer
referenced. Existing database dumps and public files are not a photo backup plan.

The existing offboarding CLI also purges the tenant's `tenants/SLUG/profiles/`
prefix using the app's photo credentials. It stops if deletion fails. Keep those
credentials available in `/etc/myntix/app.env` when running it. Do not configure automatic
expiry on live photo objects. Replaced/unreferenced objects can remain in storage;
this implementation does not run an orphan collector or create photo backups.
