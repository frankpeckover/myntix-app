# Myntix deployment installer

`install-myntix.sh` provisions a fresh Debian or Ubuntu application container.
It is intentionally limited to the app container; PostgreSQL remains on its
separate server.

## What it configures

- Operating-system updates and required packages.
- The container timezone, defaulting to `Australia/Brisbane`.
- System-wide Node.js, Git, PostgreSQL client tools, and rclone.
- A dedicated application user and an isolated optional backup-worker user
  with read-only group access to the application code.
- The GitHub checkout, exact npm dependencies, and production build.
- Clean, application-owned Next.js build output on every deployment.
- `/etc/myntix/app.env` and `/etc/myntix/backup-worker.env`.
- Hardened systemd services for the web app and backup worker.
- Runtime upload and local backup directories.
- Timestamped installer logs and journald service logs.

## Usage

1. Review the variables at the top of `install-myntix.sh`.
2. Optionally set `APP_ENV_SOURCE`, `BACKUP_ENV_SOURCE`, and
   `RCLONE_CONFIG_SOURCE` to existing files before running it.
3. Run as root:

```bash
chmod +x infrastructure/deployment/install-myntix.sh
sudo infrastructure/deployment/install-myntix.sh
```

If no environment sources are supplied, the first run creates protected
templates under `/etc/myntix`, installs the dependencies and services, then
prints the remaining environment-file action at the end. The production build
and application startup are deferred until the placeholders are replaced and
the installer is rerun. Existing env files are preserved unless an explicit
source file is configured.

For backup storage, the installer preserves `/etc/myntix/rclone.conf`, copies
an explicitly configured `RCLONE_CONFIG_SOURCE`, or automatically imports
`/root/.config/rclone/rclone.conf` when one already exists. If none exists, run
it creates a protected file from `rclone.conf.example`; enter the account ID,
R2 credentials and crypt password, then rerun the installer. The web app can
still be deployed while backup-worker startup remains deferred.
An already-installed backup worker is stopped when either its environment or
rclone configuration is incomplete, preventing queued jobs from failing while
storage is unavailable.

The script is idempotent: later runs pull the configured branch using a
fast-forward update, reinstall exact dependencies, rebuild, and restart the
services. It refuses to overwrite a checkout containing local modifications.

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
