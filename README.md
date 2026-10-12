# Myntix Ledger

Myntix Ledger is a multi-tenant internal currency ledger for schools and similar organisations. Staff award or deduct credits, students follow their balance and rewards, and administrators manage users, groups, timetables, policies, and oversight.

The application is a Next.js 16 / React 19 modular monolith backed by PostgreSQL. Tenants are resolved through a platform database and may use either a dedicated database or a schema in a shared database. See [Project documentation](infrastructure/docs/README.md) for product, API, database, operations, notification, TASS sync, and backup guides.

## Local Development

Use Node.js 24.x to match the production installer. PostgreSQL must be reachable and the platform and tenant databases must be initialized; follow [Database setup](infrastructure/database/README.md). The initial tenant admin is `admin` / `admin`; change this immediately and never use it outside a disposable development tenant.

```bash
cp .env.example .env.local
```

Set the real local PostgreSQL host, database names, and credentials in `.env.local`. For a local tenant, set `APP_ROOT_DOMAIN=app.local`, `APP_BASE_URL=http://localhost:3000`, and `LOCAL_ORGANISATION_SLUG=local` to match the seeded platform record. Generate independent secrets for `SESSION_TOKEN_HASH_SECRET`, `SSO_SECRET_ENCRYPTION_KEY`, and `API_KEY_HASH_SECRET`; do not reuse production credentials.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. The server reads `.env.local`; restart it after changing environment values.

## Production

For a Debian/Ubuntu Proxmox LXC, use the maintained [deployment installer](infrastructure/deployment/README.md). It provisions Node.js 24, PostgreSQL client tools, systemd services, protected environment files, builds the app, and restarts it. PostgreSQL stays on its own server. The application listens on `APP_PORT` (default `3000`) behind a reverse proxy or Cloudflare Tunnel; do not expose the Node port publicly.

For a manual install, copy `.env.example` to `.env.production`, configure all required variables, then run:

```bash
npm ci
npm run check:env
npm run build
npm run start
```

Production requires platform and shared-tenant PostgreSQL connection settings (`PLATFORM_POSTGRES_*` and `APP_POSTGRES_*`), a valid tenant domain/root domain, and three independent random server secrets. The app currently requires the shared-tenant connection configuration even when all registered tenants use dedicated databases. The backup catalogue is optional for the app, but all four `BACKUP_CATALOG_*` values must be configured together to enable backup UI/API access. Backup worker credentials and R2/age configuration belong in the separate worker environment; see [Backups](infrastructure/docs/BACKUPS.md).

Keep `.env.local`, `.env.production`, worker environment files, database dumps, encryption keys, and runtime uploads out of Git. The app's production service reads `/etc/myntix/app.env`; the backup worker reads `/etc/myntix/backup-worker.env`.

## Useful Commands

```bash
npm run lint
npm run check:env
npm run db:check
npm run db:configure-access
npm run organisation:offboard
```

`npm run organisation:offboard` lists active organisations. Deletion requires the
explicit `--execute <slug> --confirm <slug>` form; see the [deployment guide](infrastructure/deployment/README.md).

See [the documentation index](infrastructure/docs/README.md) for operating procedures and feature-specific setup.
