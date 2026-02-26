---
name: env-manage
description: Manages Doppler and PM2 environments for Dev (3004), Stage (3003), and Prod (3002).
---
# Environment Management

When performing tasks in this codebase, always distinguish between Dev, Stage, and Prod. This prevents port collisions and accidental cross-environment changes.

## Critical Rules

- **Dev Environment**: Port `3004`, Doppler config `dev`. PM2 app: `aibizbot-dev.gatewayglobal.ai`.
- **Stage Environment**: Port `3003`, Doppler config `stg`. PM2 app: `aibizbot-stage.gatewayglobal.ai`.
- **Prod Environment**: Port `3002`, Doppler config `prd`. PM2 app: `aibizbot.gatewayglobal.ai`.
- **Execution**: Always use `doppler run --` (or `doppler run --config <dev|stg|prd> --`) before any node/npm command that needs secrets.
- **Secrets in Doppler**: Never commit secrets. Store them in Doppler; use a local `.env` only for `DOPPLER_SERVICE_TOKEN` or `DOPPLER_TOKEN_*` so the CLI can authenticate (and keep that file gitignored).

## Commands

- List processes: `pm2 list`
- Logs: `pm2 logs aibizbot-dev.gatewayglobal.ai` or `pm2 logs aibizbot-stage.gatewayglobal.ai`
- Restart with env refresh: `pm2 restart <name> --update-env`
- Run app with secrets: `doppler run -- npm run dev` (dev) or `doppler run --config stg -- npm start` (stage)

## Pushing dev secrets to Stage and Prod (Doppler)

When **stg** or **prd** are missing variables that exist in **dev** (e.g. Stripe pricing IDs, `STRIPE_PRICE_AI_PRO`, `STRIPE_A2P_WEBHOOK_SECRET`):

1. **Push only specific keys** (recommended so you don’t overwrite stg/prd-only secrets like prod API keys):
   ```bash
   COPY_KEYS="STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_A2P_WEBHOOK_SECRET STRIPE_PRICE_AI_PRO STRIPE_PRICE_AI_BASIC" npm run doppler:copy-config
   ```
   Add or remove key names as needed.

2. **Push all dev secrets** to stg and prd (overwrites every secret in target configs):
   ```bash
   npm run doppler:copy-config
   ```
   After a full copy, re-set any stg/prd-specific values in the Doppler dashboard (e.g. production Stripe keys) if they differ from dev.

## Reference

- Decoupled strategy: `docs/deployment/DECOUPLED_ENVIRONMENT_STRATEGY.md`
- Doppler copy/sync: `npm run doppler:copy-config`, `npm run doppler:sync-ports`
