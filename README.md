# Myntix Ledger

Myntix Ledger is an internal currency ledger for organisations. The core loop is:

- teachers award or deduct internal currency
- students see balances, goals, and store options
- admins manage the economy rules and review the ledger

The app is a Next.js application backed by PostgreSQL. Tenants are resolved through a platform database and can use either a dedicated database or a schema inside a shared app database.

Product, API, notification, operations, and backup documentation is indexed in [docs/README.md](docs/README.md).

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- ESLint

## Getting Started

Install Node.js 20.19 or newer. Node.js 22 LTS is preferred for new installs.

Create `.env.local` from `.env.example` and adjust the platform database credentials:

```txt
NEXT_PUBLIC_APP_NAME=Myntix Ledger
NEXT_PUBLIC_APP_INITIALS=ML
NEXT_PUBLIC_APP_LOGO_URL=/brand/myntix-ledger-app-icon.png
NEXT_PUBLIC_APP_LOCKUP_URL=/brand/myntix-ledger-lockup.png
NEXT_PUBLIC_APP_WORDMARK_URL=/brand/myntix-ledger-wordmark.png
NEXT_PUBLIC_APP_TAGLINE=Internal currency, made simple.

PLATFORM_POSTGRES_HOST=localhost
PLATFORM_POSTGRES_PORT=5432
PLATFORM_POSTGRES_DATABASE=app_platform
PLATFORM_POSTGRES_USER=platform_app_user
PLATFORM_POSTGRES_PASSWORD=change_me

LOCAL_ORGANISATION_SLUG=dev
APP_ROOT_DOMAIN=app.local
```

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Initial admin login after running the school database setup script:

```txt
username: admin
password: admin
```

## Production Deployment

Create a production env file before building:

```bash
cp .env.example .env.production
nano .env.production
```

At minimum, production needs these values:

```txt
APP_BASE_URL=https://your-domain.example
APP_ROOT_DOMAIN=your-domain.example
APP_HOST=0.0.0.0
APP_PORT=3000
LOCAL_ORGANISATION_SLUG=dev

PLATFORM_POSTGRES_HOST=your-postgres-host
PLATFORM_POSTGRES_PORT=5432
PLATFORM_POSTGRES_DATABASE=your-platform-database
PLATFORM_POSTGRES_USER=your-platform-user
PLATFORM_POSTGRES_PASSWORD=your-platform-password

APP_POSTGRES_HOST=your-postgres-host
APP_POSTGRES_PORT=5432
APP_POSTGRES_DATABASE=your-shared-app-database
APP_POSTGRES_USER=your-shared-app-user
APP_POSTGRES_PASSWORD=your-shared-app-password

SESSION_TOKEN_HASH_SECRET=long-random-secret
SSO_SECRET_ENCRYPTION_KEY=long-random-secret
API_KEY_HASH_SECRET=long-random-secret
```

Validate the environment before building:

```bash
npm run check:env
```

Then build and start:

```bash
npm ci
npm run build
npm run start
```

`APP_PORT` is the internal port the Next.js process listens on. It can stay as `3000` behind Nginx, Caddy, Traefik, or Cloudflare Tunnel. Do not expose the app port directly to the internet.

If you see this during build:

```txt
Missing required environment variable: APP_ROOT_DOMAIN
```

the server does not have `APP_ROOT_DOMAIN` available to `npm run build`. Add it to `.env.production`, `.env.local`, or the systemd service environment, then rebuild from a clean `.next` directory:

```bash
rm -rf .next
npm run check:env
npm run build
```

For an LXC/Proxmox deployment, use:

```bash
sudo APP_DIR=/opt/myntix/app \
  REPO_URL=https://github.com/frankpeckover/schoolbank.git \
  BRANCH=main \
  SERVICE_NAME=myntix \
  bash scripts/deploy-proxmox-lxc.sh
```

The deploy script creates a systemd service that reads `${APP_DIR}/.env.production` and `${APP_DIR}/.env.local`, then runs `npm run start`. Change ports by editing `APP_PORT` in the env file, not the service command.

Keep production secrets out of git. `.env`, `.env.local`, `.env.production`, `.env.production.local`, and uploaded runtime files are ignored.

## Deployment Checklist

1. Node.js 20.19+ installed.
2. PostgreSQL reachable from the app server.
3. Platform database created.
4. Tenant database or schema created.
5. `.env.production` or `.env.local` present on the server.
6. `npm run check:env` passes.
7. `npm run build` passes.
8. Reverse proxy passes `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`.
9. HTTPS is terminated by the reverse proxy or Cloudflare Tunnel.
10. Postgres is not exposed publicly.
