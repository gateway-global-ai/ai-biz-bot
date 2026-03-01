# Deploy scripts — single path (no manual migrations or port fixes)

Deployment is **script-only**. Do not leave "run this SQL then restart" or "if port in use, run kill-port" as manual steps. The scripts below handle migrations and port cleanup.

## What each script does

1. **Stop** the PM2 app (frees the port).
2. **Run migrations** (`npm run db:migrate` → all `migrations/*.sql` in order; requires Doppler so `DATABASE_URL` is set).
3. **Install** (`npm ci`) and **build** (`npm run build`).
4. **Start** the PM2 app (or restart if already defined).

## Commands (run on the server in the app directory)

| Environment | Directory | Command |
|-------------|-----------|---------|
| **Prod** | `/opt/gatewayglobal/aibizbot.gatewayglobal.ai` | `./script/deploy-server.sh aibizbot.gatewayglobal.ai` |
| **Stage** | `/opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai` | `./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai` |
| **Dev** | `/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai` | `./script/deploy-dev.sh aibizbot-dev.gatewayglobal.ai` |

## Prerequisites on the server

- **Doppler** configured in that directory (`doppler setup` with the correct project/config) so `npm run db:migrate` gets `DATABASE_URL`.
- **PM2** installed; app already defined (first-time setup is in [DEPLOY_STAGE_AND_DEV_CHECKLIST.md](DEPLOY_STAGE_AND_DEV_CHECKLIST.md)).

## If "port in use" still appears

1. Run once: `npm run kill-port` (uses PORT from Doppler for that config).
2. Re-run the deploy script for that environment.

## Adding a new migration

- Add `migrations/NNNN_description.sql`. The next run of any deploy script will run it (via `npm run db:migrate`). Migrations should be idempotent (e.g. `CREATE TABLE IF NOT EXISTS`).

## npm scripts used by deploy

- `npm run db:migrate` — runs all `migrations/*.sql` in order (Doppler supplies `DATABASE_URL`).
- `npm run kill-port` — stops the PM2 app for the current PORT and kills any process on that port (Doppler supplies `PORT`).
