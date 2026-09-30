#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

# -----------------------------------------------------------------------------
# Deployment settings
# Edit this block before running the installer.
# -----------------------------------------------------------------------------
REPOSITORY_URL="https://github.com/frankpeckover/myntix-app.git"
REPOSITORY_BRANCH="main"

APP_USER="myntix"
APP_GROUP="myntix"
APP_HOME_DIRECTORY="/var/lib/myntix"
APP_DIRECTORY="/opt/myntix/app"
APP_SERVICE_NAME="myntix-app"
APP_ENV_FILE="/etc/myntix/app.env"
APP_ENV_SOURCE=""
APP_PORT="3000"

INSTALL_BACKUP_WORKER="true"
BACKUP_USER="myntix-backup"
BACKUP_GROUP="myntix-backup"
BACKUP_SERVICE_NAME="myntix-backup-worker"
BACKUP_ENV_FILE="/etc/myntix/backup-worker.env"
BACKUP_ENV_SOURCE=""
BACKUP_DATA_DIRECTORY="/var/lib/myntix-backup-worker"
RCLONE_CONFIG_FILE="/etc/myntix/rclone.conf"
RCLONE_CONFIG_SOURCE=""
DEFAULT_RCLONE_CONFIG_SOURCE="/root/.config/rclone/rclone.conf"
RCLONE_CONFIG_EXAMPLE="${APP_DIRECTORY}/infrastructure/config/backup-worker/rclone.conf.example"

NODE_MAJOR_VERSION="24"
SYSTEM_TIMEZONE="Australia/Brisbane"
RUN_SYSTEM_UPGRADE="true"
START_SERVICES="true"

INSTALLER_LOG_DIRECTORY="/var/log/myntix-installer"
INSTALLER_LOG_FILE="${INSTALLER_LOG_DIRECTORY}/install-$(date -u +%Y%m%dT%H%M%SZ).log"
APP_ENV_READY="true"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this installer as root." >&2
    exit 1
  fi
}

prepare_logging() {
  install -d -m 0750 "$INSTALLER_LOG_DIRECTORY"
  touch "$INSTALLER_LOG_FILE"
  chmod 0640 "$INSTALLER_LOG_FILE"
  exec > >(tee -a "$INSTALLER_LOG_FILE") 2>&1
}

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

on_error() {
  local line="$1"
  local command="$2"
  log "ERROR at line ${line}: ${command}"
  log "Review ${INSTALLER_LOG_FILE} for the complete log."
}

is_true() {
  [[ "${1,,}" == "true" ]]
}

validate_platform() {
  if [[ ! -r /etc/os-release ]]; then
    log "ERROR: /etc/os-release is unavailable."
    exit 1
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID_LIKE:-$ID}" != *debian* && "$ID" != "debian" && "$ID" != "ubuntu" ]]; then
    log "ERROR: this installer supports Debian and Ubuntu only."
    exit 1
  fi

  log "Detected ${PRETTY_NAME:-$ID}"
}

install_system_packages() {
  log "Updating package indexes"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update

  if is_true "$RUN_SYSTEM_UPGRADE"; then
    log "Installing operating-system updates"
    apt-get upgrade -y
  fi

  log "Installing Git, PostgreSQL client tools, rclone, and prerequisites"
  apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gnupg \
    postgresql-client \
    rclone \
    tzdata
}

configure_timezone() {
  local zone_file="/usr/share/zoneinfo/${SYSTEM_TIMEZONE}"
  if [[ ! -f "$zone_file" ]]; then
    log "ERROR: unknown system timezone: ${SYSTEM_TIMEZONE}"
    exit 1
  fi

  log "Configuring system timezone as ${SYSTEM_TIMEZONE}"
  if command -v timedatectl >/dev/null 2>&1; then
    timedatectl set-timezone "$SYSTEM_TIMEZONE"
  else
    ln -sfn "$zone_file" /etc/localtime
    printf '%s\n' "$SYSTEM_TIMEZONE" >/etc/timezone
  fi
}

install_nodejs() {
  local installed_major=""
  if command -v node >/dev/null 2>&1; then
    installed_major="$(node -p 'process.versions.node.split(".")[0]')"
  fi

  if [[ "$installed_major" == "$NODE_MAJOR_VERSION" ]]; then
    log "Node.js $(node --version) is already installed"
    return
  fi

  log "Installing Node.js ${NODE_MAJOR_VERSION}.x from NodeSource"
  local setup_script
  setup_script="$(mktemp)"
  curl --fail --silent --show-error --location \
    "https://deb.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" \
    --output "$setup_script"
  bash "$setup_script"
  rm -f "$setup_script"
  apt-get install -y nodejs

  installed_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$installed_major" != "$NODE_MAJOR_VERSION" ]]; then
    log "ERROR: expected Node.js ${NODE_MAJOR_VERSION}.x, found $(node --version)."
    exit 1
  fi

  log "Installed Node.js $(node --version) and npm $(npm --version)"
}

create_service_accounts() {
  if ! getent group "$APP_GROUP" >/dev/null; then
    groupadd --system "$APP_GROUP"
  fi
  if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --gid "$APP_GROUP" --home-dir "$APP_HOME_DIRECTORY" --shell /usr/sbin/nologin "$APP_USER"
  elif [[ "$(getent passwd "$APP_USER" | cut -d: -f6)" != "$APP_HOME_DIRECTORY" ]]; then
    usermod --home "$APP_HOME_DIRECTORY" "$APP_USER"
  fi

  install -d -m 0750 -o "$APP_USER" -g "$APP_GROUP" "$APP_HOME_DIRECTORY"
  install -d -m 0750 -o "$APP_USER" -g "$APP_GROUP" "$APP_HOME_DIRECTORY/.npm"
  install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$(dirname "$APP_DIRECTORY")"
  install -d -m 0755 -o root -g root /etc/myntix

  if is_true "$INSTALL_BACKUP_WORKER"; then
    if ! getent group "$BACKUP_GROUP" >/dev/null; then
      groupadd --system "$BACKUP_GROUP"
    fi
    if ! id "$BACKUP_USER" >/dev/null 2>&1; then
      useradd --system --gid "$BACKUP_GROUP" --home-dir "$BACKUP_DATA_DIRECTORY" --shell /usr/sbin/nologin "$BACKUP_USER"
    elif [[ "$(getent passwd "$BACKUP_USER" | cut -d: -f6)" != "$BACKUP_DATA_DIRECTORY" ]]; then
      usermod --home "$BACKUP_DATA_DIRECTORY" "$BACKUP_USER"
    fi
    usermod --append --groups "$APP_GROUP" "$BACKUP_USER"
    install -d -m 0750 -o "$BACKUP_USER" -g "$BACKUP_GROUP" "$BACKUP_DATA_DIRECTORY"
  fi
}

checkout_application() {
  if [[ -d "$APP_DIRECTORY/.git" ]]; then
    log "Updating existing application checkout"
    if [[ -n "$(runuser -u "$APP_USER" -- git -C "$APP_DIRECTORY" status --porcelain)" ]]; then
      log "ERROR: ${APP_DIRECTORY} contains local changes. Commit or remove them before deploying."
      exit 1
    fi
    runuser -u "$APP_USER" -- git -C "$APP_DIRECTORY" fetch --prune origin
    runuser -u "$APP_USER" -- git -C "$APP_DIRECTORY" checkout "$REPOSITORY_BRANCH"
    runuser -u "$APP_USER" -- git -C "$APP_DIRECTORY" pull --ff-only origin "$REPOSITORY_BRANCH"
  else
    if [[ -e "$APP_DIRECTORY" && -n "$(find "$APP_DIRECTORY" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
      log "ERROR: ${APP_DIRECTORY} exists and is not an empty Git checkout."
      exit 1
    fi
    install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" "$APP_DIRECTORY"
    log "Cloning ${REPOSITORY_URL} (${REPOSITORY_BRANCH})"
    runuser -u "$APP_USER" -- git clone --branch "$REPOSITORY_BRANCH" --single-branch \
      "$REPOSITORY_URL" "$APP_DIRECTORY"
  fi
}

install_environment_files() {
  install_environment_file \
    "$APP_ENV_SOURCE" \
    "$APP_ENV_FILE" \
    "$APP_DIRECTORY/.env.example" \
    "$APP_GROUP"

  ln -sfn "$APP_ENV_FILE" "$APP_DIRECTORY/.env.production"
  chown -h "$APP_USER:$APP_GROUP" "$APP_DIRECTORY/.env.production"

  if ! is_true "$INSTALL_BACKUP_WORKER"; then
    return
  fi

  install_environment_file \
    "$BACKUP_ENV_SOURCE" \
    "$BACKUP_ENV_FILE" \
    "$APP_DIRECTORY/infrastructure/config/backup-worker/backup-worker.env.example" \
    "$BACKUP_GROUP"

  install_rclone_config
}

install_rclone_config() {
  local source_file="$RCLONE_CONFIG_SOURCE"

  if [[ -z "$source_file" && -s "$DEFAULT_RCLONE_CONFIG_SOURCE" ]]; then
    source_file="$DEFAULT_RCLONE_CONFIG_SOURCE"
    log "Using existing root rclone configuration from ${source_file}"
  fi

  if [[ -n "$source_file" ]]; then
    if [[ ! -s "$source_file" ]]; then
      log "ERROR: rclone configuration source is missing or empty: ${source_file}"
      exit 1
    fi
    install -m 0640 -o root -g "$BACKUP_GROUP" "$source_file" "$RCLONE_CONFIG_FILE"
  elif [[ -s "$RCLONE_CONFIG_FILE" ]]; then
    chown root:"$BACKUP_GROUP" "$RCLONE_CONFIG_FILE"
    chmod 0640 "$RCLONE_CONFIG_FILE"
  else
    install -m 0640 -o root -g "$BACKUP_GROUP" "$RCLONE_CONFIG_EXAMPLE" "$RCLONE_CONFIG_FILE"
    log "Created ${RCLONE_CONFIG_FILE} from its example. Enter the R2 credentials and rerun the installer."
  fi
}

install_environment_file() {
  local source_file="$1"
  local target_file="$2"
  local example_file="$3"
  local target_group="$4"

  if [[ -n "$source_file" ]]; then
    if [[ ! -f "$source_file" ]]; then
      log "ERROR: environment source does not exist: ${source_file}"
      exit 1
    fi
    install -m 0640 -o root -g "$target_group" "$source_file" "$target_file"
  elif [[ ! -f "$target_file" ]]; then
    install -m 0640 -o root -g "$target_group" "$example_file" "$target_file"
    log "Created ${target_file} from its example. Enter real values and rerun the installer."
  else
    chown root:"$target_group" "$target_file"
    chmod 0640 "$target_file"
  fi
}

validate_application_environment() {
  if grep -Eq '=(change_me|your-|example\.)' "$APP_ENV_FILE"; then
    APP_ENV_READY="false"
    log "Application environment still contains placeholders; build and service startup will be deferred."
  fi
}

install_application() {
  log "Installing exact npm dependencies"
  runuser -u "$APP_USER" -- env \
    HOME="$APP_HOME_DIRECTORY" \
    npm_config_cache="$APP_HOME_DIRECTORY/.npm" \
    npm --prefix "$APP_DIRECTORY" ci

  install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" \
    "$APP_DIRECTORY/public/uploads" \
    "$APP_DIRECTORY/public/uploads/logos" \
    "$APP_DIRECTORY/public/uploads/shop-items" \
    "$APP_DIRECTORY/public/uploads/users"

  if ! is_true "$APP_ENV_READY"; then
    log "Skipping production build until ${APP_ENV_FILE} is configured."
    return
  fi

  # Build output is disposable. Recreate it to prevent stale root-owned files
  # from blocking builds performed by the unprivileged application account.
  rm -rf -- "$APP_DIRECTORY/.next"
  install -d -m 0755 -o "$APP_USER" -g "$APP_GROUP" \
    "$APP_DIRECTORY/.next" \
    "$APP_DIRECTORY/.next/cache"

  log "Building the production application"
  runuser -u "$APP_USER" -- env \
    HOME="$APP_HOME_DIRECTORY" \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_cache="$APP_HOME_DIRECTORY/.npm" \
    npm --prefix "$APP_DIRECTORY" run build
}

install_systemd_services() {
  log "Installing ${APP_SERVICE_NAME}.service"
  cat >"/etc/systemd/system/${APP_SERVICE_NAME}.service" <<EOF
[Unit]
Description=Myntix application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIRECTORY}
Environment=NODE_ENV=production
Environment=APP_PORT=${APP_PORT}
Environment=HOME=${APP_HOME_DIRECTORY}
EnvironmentFile=${APP_ENV_FILE}
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadOnlyPaths=${APP_DIRECTORY} ${APP_ENV_FILE}
ReadWritePaths=${APP_DIRECTORY}/.next/cache ${APP_DIRECTORY}/public/uploads
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF
  chmod 0644 "/etc/systemd/system/${APP_SERVICE_NAME}.service"

  if is_true "$INSTALL_BACKUP_WORKER"; then
    log "Installing ${BACKUP_SERVICE_NAME}.service"
    cat >"/etc/systemd/system/${BACKUP_SERVICE_NAME}.service" <<EOF
[Unit]
Description=Myntix tenant backup and restore worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${BACKUP_USER}
Group=${BACKUP_GROUP}
SupplementaryGroups=${APP_GROUP}
WorkingDirectory=${APP_DIRECTORY}
EnvironmentFile=${BACKUP_ENV_FILE}
ExecStart=/usr/bin/node scripts/backup-worker.mjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadOnlyPaths=${APP_DIRECTORY} ${BACKUP_ENV_FILE} ${RCLONE_CONFIG_FILE}
ReadWritePaths=${BACKUP_DATA_DIRECTORY}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${BACKUP_SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF
    chmod 0644 "/etc/systemd/system/${BACKUP_SERVICE_NAME}.service"
  fi

  systemctl daemon-reload
}

start_services() {
  if ! is_true "$START_SERVICES"; then
    log "Service startup disabled by START_SERVICES=${START_SERVICES}"
    return
  fi

  if ! is_true "$APP_ENV_READY"; then
    log "Application service not started until ${APP_ENV_FILE} is configured."
    return
  fi

  log "Enabling and starting ${APP_SERVICE_NAME}"
  systemctl enable "$APP_SERVICE_NAME"
  systemctl restart "$APP_SERVICE_NAME"

  if ! is_true "$INSTALL_BACKUP_WORKER"; then
    return
  fi

  if grep -Eq '=(change_me|your-|example\.)' "$BACKUP_ENV_FILE"; then
    log "Backup worker not started: ${BACKUP_ENV_FILE} contains placeholders."
    systemctl disable --now "$BACKUP_SERVICE_NAME" >/dev/null 2>&1 || true
    return
  fi
  if [[ ! -s "$RCLONE_CONFIG_FILE" ]]; then
    log "Backup worker not started: ${RCLONE_CONFIG_FILE} is missing or empty."
    systemctl disable --now "$BACKUP_SERVICE_NAME" >/dev/null 2>&1 || true
    return
  fi
  if grep -Eq '(change_me|<account-id>)' "$RCLONE_CONFIG_FILE"; then
    log "Backup worker not started: ${RCLONE_CONFIG_FILE} contains placeholders."
    systemctl disable --now "$BACKUP_SERVICE_NAME" >/dev/null 2>&1 || true
    return
  fi

  log "Enabling and starting ${BACKUP_SERVICE_NAME}"
  systemctl enable "$BACKUP_SERVICE_NAME"
  systemctl restart "$BACKUP_SERVICE_NAME"
}

verify_application() {
  if ! is_true "$START_SERVICES" || ! is_true "$APP_ENV_READY"; then
    return
  fi

  sleep 3
  if ! systemctl is-active --quiet "$APP_SERVICE_NAME"; then
    log "ERROR: ${APP_SERVICE_NAME} did not remain active."
    journalctl -u "$APP_SERVICE_NAME" -n 80 --no-pager || true
    exit 1
  fi

  local status_code
  status_code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --max-time 10 "http://127.0.0.1:${APP_PORT}/" || true)"
  if [[ ! "$status_code" =~ ^(2|3)[0-9][0-9]$ ]]; then
    log "WARNING: local HTTP check returned ${status_code:-no response}; inspect the service and proxy configuration."
  else
    log "Local HTTP check passed with status ${status_code}"
  fi
}

main() {
  require_root
  prepare_logging
  trap 'on_error "$LINENO" "$BASH_COMMAND"' ERR

  log "Starting Myntix installation"
  validate_platform
  install_system_packages
  configure_timezone
  install_nodejs
  create_service_accounts
  checkout_application
  install_environment_files
  validate_application_environment
  install_application
  install_systemd_services
  start_services
  verify_application

  if is_true "$APP_ENV_READY"; then
    log "Myntix installation completed successfully"
  else
    log "Myntix installation preparation completed successfully"
    log "NEXT STEP: edit ${APP_ENV_FILE}, replace its placeholders, then rerun this installer."
  fi
  log "Installer log: ${INSTALLER_LOG_FILE}"
  log "Application logs: journalctl -u ${APP_SERVICE_NAME} -f"
  if is_true "$INSTALL_BACKUP_WORKER"; then
    log "Backup worker logs: journalctl -u ${BACKUP_SERVICE_NAME} -f"
  fi
}

main "$@"
