# Operations Status Contract

The admin dashboard's operational signals are sourced from the tenant audit,
error, and API request logs. Backup history and worker job state are read from
the separate backup catalogue database; credentials and storage secrets never
enter a tenant database. If the catalogue is unavailable or not configured,
backup status cannot be reported by the dashboard.

The app does not currently provide a host-level control plane for rebooting
containers or inspecting CPU, memory, disk, and PostgreSQL connection capacity.
Use Proxmox, systemd/journald, and PostgreSQL monitoring for those host-level
tasks. See `infrastructure/docs/BACKUPS.md` for backup scheduling, worker,
retention, and restore behavior.
