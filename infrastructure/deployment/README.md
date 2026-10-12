# Myntix deployment installer

`install-myntix.sh` provisions a Debian or Ubuntu application container. It is
intentionally limited to the app container; PostgreSQL remains on its separate
server. The installer targets Node.js 24.x and the `main` branch; edit the
configuration block at the top of the script before using a different layout.

## What it configures

- Operating-system updates and required packages.
- The container timezone, defaulting to `Australia/Brisbane`.
- System-wide Node.js, Git, PostgreSQL client tools, and rclone.
- A dedicated application user and an isolated optional backup-worker user
  with read-only group access to the application code.
- The GitHub checkout, exact npm dependencies, and production build.
- Clean, application-owned Next.js build output on every deployment.
- `/etc/myntix/app.env` and `/etc/myntix/backup-worker.env`.
- Root-only `/etc/myntix/offboarding.env` for approved tenant deletion.
- Hardened systemd services for the web app and backup worker.
- Runtime upload and local backup directories.
- Timestamped installer logs and journald service logs.

## Usage

1. Review the variables at the top of `install-myntix.sh`, especially the
   repository branch, app port, and whether to install the backup worker.
2. Optionally set `APP_ENV_SOURCE`, `BACKUP_ENV_SOURCE`,
   `RCLONE_CONFIG_SOURCE`, `BACKUP_AGE_IDENTITY_SOURCE`, and
   `OFFBOARD_ENV_SOURCE` to existing files before running it.
3. Run from the checkout, as root:

```bash
chmod +x infrastructure/deployment/install-myntix.sh
sudo infrastructure/deployment/install-myntix.sh
```

If no environment sources are supplied, the first run creates protected
templates under `/etc/myntix`, installs dependencies and service definitions,
then prints the remaining environment-file action at the end. The production
build and application startup are deferred until required placeholders are
replaced and the installer is rerun. Existing env files are preserved unless
an explicit source file is configured. The app env file is `/etc/myntix/app.env`
and is linked as `.env.production` in the checkout; do not keep a second live
copy of secrets in the repository.

For backup storage, the installer preserves `/etc/myntix/rclone.conf`, copies
an explicitly configured `RCLONE_CONFIG_SOURCE`, or automatically imports
`/root/.config/rclone/rclone.conf` when one already exists. If none exists, run
it creates a protected file from `rclone.conf.example`; enter the Cloudflare
account ID and R2 credentials, then rerun the installer. Provision one shared
age identity at `/etc/myntix/backup-age.key`, or set
`BACKUP_AGE_IDENTITY_SOURCE` in the installer. Every backup worker must receive
the same identity; keep a separate offline copy of it. The web app can still be
deployed while backup-worker startup remains deferred.
An already-installed backup worker is stopped when either its environment or
rclone configuration is incomplete, preventing queued jobs from failing while
storage is unavailable.

The script is idempotent: later runs fetch and fast-forward the configured
branch, install exact dependencies, remove and recreate `.next`, rebuild, and
restart the services. It refuses to overwrite local modifications. Next.js can
rewrite the tracked `next-env.d.ts` during a build. If that file is the only
local change and exactly matches the incoming branch, the installer restores
the current revision before pulling so the new commit can update it. Any other
local or staged changes still stop deployment for review.

## Manual deployment troubleshooting

If you update with `git pull` instead of the installer and Git reports a local
change to `next-env.d.ts`, compare it first:

```bash
git diff -- next-env.d.ts
```

Next.js 16 may generate imports for `.next/types/routes.d.ts` and
`.next/types/root-params.d.ts` during a build. Git compares the working file to
the server's current `HEAD`, not directly to the incoming commit, so the local
file may block `git pull` even when it already matches the new GitHub version.
If the diff contains only generated Next references and no hand edits, run
`git restore -- next-env.d.ts`, then pull, build, and restart. Do not restore it
if the diff contains intentional edits.

After a manual update, verify all three stages completed:

```bash
git rev-parse --short HEAD
npm ci
npm run check:env
npm run build
sudo systemctl restart myntix-app
sudo systemctl status myntix-app --no-pager
```

The commit hash should match the release being deployed. A Git pull alone does
not rebuild the app or replace the running Node.js process.

## Organisation offboarding

Organisation admins can send a deletion-request email to the address configured
by `ORGANISATION_DELETION_REQUEST_EMAIL`. The email is notification only and
does not alter the tenant. After independently reviewing the email, a platform
owner can list organisations on the app container:

```bash
cd /opt/myntix/app
sudo npm run organisation:offboard
```

Execute the requested organisation using its slug twice as an explicit check:

```bash
sudo npm run organisation:offboard -- --execute <slug> --confirm <slug>
```

Execution disables routing first, purges encrypted tenant backups, removes
backup catalogue records and tenant uploads, drops the tenant schema or
database, and writes progress or failures to the command output. Keep the
original request email as the approval record.

## Logs

Installer logs:

```bash
ls -lt /var/log/myntix-installer/
```

Application and backup-worker logs:

```bash
journalctl -u myntix-app -f
journalctl -u myntix-backup-worker -f
```
