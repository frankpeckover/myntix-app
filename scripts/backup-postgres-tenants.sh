#!/usr/bin/env bash
set -euo pipefail
umask 077

# Run with a PostgreSQL backup role that can read every tenant database.
# libpq credentials can be supplied through PGUSER/PGPASSWORD or ~/.pgpass.
PLATFORM_DATABASE="${PLATFORM_DATABASE:?Set PLATFORM_DATABASE to the platform database name}"
SHARED_DATABASE="${SHARED_DATABASE:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
BACKUP_LOG_FILE="${BACKUP_LOG_FILE:-}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
export PGHOST PGPORT PGUSER PGPASSWORD RCLONE_CONFIG

if [[ -n "$BACKUP_LOG_FILE" ]]; then
  mkdir -p "$(dirname "$BACKUP_LOG_FILE")"
  exec > >(tee -a "$BACKUP_LOG_FILE") 2>&1
fi

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

log_failure() {
  local exit_code=$?
  log "Backup failed with exit code $exit_code at line ${BASH_LINENO[0]}."
  exit "$exit_code"
}

trap log_failure ERR

for command in psql pg_dump pg_dumpall sha256sum; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing command: $command" >&2; exit 1; }
done
if [[ -n "$RCLONE_REMOTE" ]]; then
  command -v rclone >/dev/null 2>&1 || { echo 'Missing command: rclone' >&2; exit 1; }
fi

run_id="$(date -u +%Y-%m-%dT%H%M%SZ)"
run_dir="${BACKUP_DIR%/}/$run_id"
log "Starting PostgreSQL backup $run_id."
log "Local destination: $run_dir"
if [[ -e "$run_dir" ]]; then
  echo "Backup directory already exists: $run_dir" >&2
  exit 1
fi
mkdir -p "$run_dir"
inventory="$run_dir/tenant-inventory.csv"
targets="$run_dir/database-targets.tsv"
manifest="$run_dir/manifest.tsv"

psql -X -q -v ON_ERROR_STOP=1 -d "$PLATFORM_DATABASE" -c "\copy (select slug, tenancy_mode, schema_name, database_host, database_port, database_name, is_active from organisations order by slug) to stdout with (format csv, header true)" > "$inventory"
psql -X -q -A -t -F $'\t' -v ON_ERROR_STOP=1 -d "$PLATFORM_DATABASE" -c "select distinct database_host, coalesce(database_port, 5432), database_name from organisations where tenancy_mode = 'database' order by 1, 2, 3" > "$targets"
schema_count="$(psql -X -q -A -t -v ON_ERROR_STOP=1 -d "$PLATFORM_DATABASE" -c "select count(*) from organisations where tenancy_mode = 'schema'")"
if [[ "$schema_count" -gt 0 && -z "$SHARED_DATABASE" ]]; then
  echo 'Schema tenants exist: set SHARED_DATABASE before running backups.' >&2
  exit 1
fi

printf 'file\tkind\thost\tport\tdatabase\n' > "$manifest"
dump_database() {
  local file="$1" kind="$2" host="$3" port="$4" database="$5"
  PGHOST="$host" PGPORT="$port" pg_dump -Fc -f "$run_dir/$file.partial" "$database"
  mv "$run_dir/$file.partial" "$run_dir/$file"
  printf '%s\t%s\t%s\t%s\t%s\n' "$file" "$kind" "$host" "$port" "$database" >> "$manifest"
}

dump_database platform.dump platform "$PGHOST" "$PGPORT" "$PLATFORM_DATABASE"

if [[ "$schema_count" -gt 0 ]]; then
  dump_database shared-schemas.dump shared "$PGHOST" "$PGPORT" "$SHARED_DATABASE"
fi

index=0
while IFS=$'\t' read -r host port database; do
  [[ -n "$host" && -n "$port" && -n "$database" ]] || { echo 'Invalid database target in platform table.' >&2; exit 1; }
  index=$((index + 1))
  printf -v tenant_file 'tenant-%04d.dump' "$index"
  dump_database "$tenant_file" dedicated "$host" "$port" "$database"
done < "$targets"

pg_dumpall --globals-only -f "$run_dir/postgres-roles.sql"
(
  cd "$run_dir"
  sha256sum -- *.dump postgres-roles.sql tenant-inventory.csv manifest.tsv > SHA256SUMS
)

if [[ -n "$RCLONE_REMOTE" ]]; then
  # RCLONE_REMOTE should be an rclone crypt remote backed by a private R2 bucket.
  remote_run_dir="${RCLONE_REMOTE%/}/$run_id"
  log "Uploading backup to $remote_run_dir"
  rclone copy "$run_dir" "$remote_run_dir" \
    --immutable \
    --stats 30s \
    --stats-one-line \
    --log-level INFO
  log "Verifying uploaded backup."
  rclone check "$run_dir" "$remote_run_dir" --one-way --log-level INFO
  log "Upload verified: $remote_run_dir"
else
  log "Remote upload skipped because RCLONE_REMOTE is empty."
fi

trap - ERR
log "Backup complete: $run_dir"
