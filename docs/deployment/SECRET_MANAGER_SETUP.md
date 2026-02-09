# Secret Manager Setup (Doppler)

This project uses **[Doppler](https://www.doppler.com/)** as the secret manager for dev, staging, and production. All env vars live in Doppler; nothing is committed.

---

## 1. Why Doppler

- **One place** for all secrets; **separate configs** for dev / staging / production.
- **CLI** injects env into your process: `doppler run -- npm run dev`.
- **Service tokens** for servers (staging/prod) so no interactive login.
- **Free tier** is enough for small teams and multiple configs.
- **Audit** and access control in the Doppler dashboard.

---

## 2. Install Doppler CLI

**macOS (Homebrew):**
```bash
brew install dopplerhq/cli/doppler
```

**Linux (script):**
```bash
(curl -Ls --tlsv1.2 --proto '=https' https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh
```

**Windows:** `winget install doppler.doppler` or see [Doppler Install](https://docs.doppler.com/docs/install-cli).

Verify:
```bash
doppler --version
```

---

## 3. Create a Doppler Project and Configs

1. **Sign up / log in:** [https://dashboard.doppler.com](https://dashboard.doppler.com).

2. **Create a project** (e.g. `gateway-global-ai` or `chat-mvp-merge`).

3. **Create three configs** in that project:
   - `dev` – local development
   - `staging` – staging server (aibizbot-stage.gatewayglobal.ai)
   - `production` – production server (aibizbot.gatewayglobal.ai)

4. **Add your secrets** to each config. Use the same **variable names** as in `.env.example`; only the **values** differ per environment (e.g. different `DATABASE_URL`, different Twilio numbers for staging vs prod).

   **Minimum set** (from `.env.example`):
   - `DATABASE_URL`
   - `NODE_ENV`, `PORT`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_PHONE_NUMBER` (or `TWILIO_PHONE_NUMBER_BOT`)
   - `GOOGLE_API_KEY` or `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY` / `GOOGLE_CLOUD_API_KEY` (or `GOOGLE_MAPS_JS_API`)
   - `SESSION_SECRET`, `ENCRYPTION_KEY` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

   Add any others you use (Stripe, Replicate, HuggingFace, Discord, Telegram, etc.) from your current `env.local` / `.env`.

5. **Optional – import from a file:** If you have a local `.env` or `env.local` (with real values), you can upload via Doppler dashboard (paste) or use [Doppler’s import](https://docs.doppler.com/docs/import-secrets). Prefer copying variable names from `.env.example` and pasting values into Doppler so you don’t leak secrets from your machine.

---

## 4. Local Development (dev config)

**One-time setup in this repo:**
```bash
cd /path/to/chat-mvp-merge
doppler login
doppler setup
```
Choose your **project** and config **dev**. This links the repo directory to Doppler so you don’t need to pass project/config every time.

**Run the app with secrets from Doppler:**
```bash
doppler run -- npm run dev
```

Or use the npm script:
```bash
npm run dev:doppler
```

Secrets are injected into the process; no `.env` file needed locally.

---

## 5. Staging and Production Servers

Servers should **not** use interactive `doppler login`. Use a **service token** per config.

1. In Doppler: **Project → your project → Access → Service Tokens** (or **Config → Service Tokens**).
2. Create a token for **staging** (config: `staging`) and one for **production** (config: `production`). Name them e.g. `staging-server` and `production-server`.
3. On each server, set the token in the environment (or in a small env file that is not committed):
   - **Staging:** `DOPPLER_TOKEN=<staging-service-token>`
   - **Production:** `DOPPLER_TOKEN=<production-service-token>`

**Run the app on the server:**

Staging (from the staging app directory, e.g. `/opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai`):
```bash
export DOPPLER_TOKEN="dp.staging.xxxx"   # or put in a one-line file and source it
doppler run --config staging -- npm start
```

With PM2 (recommended):
```bash
# Start once with Doppler injecting env
pm2 start "doppler run --config staging -- node dist/index.cjs" --name aibizbot-stage.gatewayglobal.ai
# Or use an ecosystem file (see below)
```

Production: same idea with `--config production` and the production service token.

**Optional – write env to a file:** If you prefer the app to read a `.env` file on the server (e.g. for PM2), you can generate it at deploy time:
```bash
doppler run --config staging -- env | grep -v '^DOPPLER_' > .env
pm2 restart aibizbot-stage.gatewayglobal.ai --update-env
```
(Do not commit that `.env`; keep it only on the server.)

---

## 6. NPM Scripts (this repo)

In `package.json`:

| Script | Use |
|--------|-----|
| `npm run dev:doppler` | Run dev server with Doppler (dev config). |
| `npm run start:doppler` | Run production build with Doppler (uses default config from `doppler setup`; override with `doppler run --config production -- npm start` on the server). |

---

## 7. PM2 Ecosystem Example (optional)

If you use PM2, you can keep using Doppler to inject env and avoid storing secrets in a file:

`ecosystem.config.example.cjs` (do not commit real tokens):

```javascript
module.exports = {
  apps: [
    {
      name: 'aibizbot-stage.gatewayglobal.ai',
      script: 'node',
      args: 'dist/index.cjs',
      cwd: '/opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai',
      interpreter: 'none',
      env: { DOPPLER_TOKEN: 'dp.staging.xxxx' },
      // Run via a wrapper so PM2 runs doppler run -- node ...
      // Or use a small start script: doppler run --config staging -- node dist/index.cjs
    },
  ],
};
```

Simpler approach: have a `start-with-doppler.sh` on the server:
```bash
#!/bin/bash
cd "$(dirname "$0")"
exec doppler run --config staging -- node dist/index.cjs
```
Then `pm2 start start-with-doppler.sh --name aibizbot-stage`. Set `DOPPLER_TOKEN` in the environment (e.g. in `~/.bashrc` or a sourced file) so the script can use it.

---

## 8. Migrating from env.local

1. Create the three Doppler configs (dev, staging, production) and add every variable from your current `env.local` (and `.env.example`) into the right config.
2. Run locally with `doppler run -- npm run dev` (or `npm run dev:doppler`). Remove or rename `env.local` so you don’t accidentally use it; prefer `.env.local` only if you need a few local overrides (Doppler can override with local env).
3. On staging and production, install Doppler CLI, set the appropriate `DOPPLER_TOKEN`, and run the app with `doppler run --config <staging|production> -- npm start` (or the PM2 wrapper above).
4. After everything works, **rotate any secret that ever lived in a committed file** (see [SECRETS_AND_ENV.md](SECRETS_AND_ENV.md)).

---

## 9. Alternative: Infisical

If you prefer an open-source option:

- **[Infisical](https://infisical.com/)** – self-host or use their cloud. Similar idea: project + environments (dev/staging/prod), CLI injects env.
- Install: `brew install infisical/get-cli/infisical` (or see their docs).
- Login and link project: `infisical login`, then `infisical init`.
- Run: `infisical run -- npm run dev` (and use different env names for staging/prod in the Infisical dashboard).

We document Doppler as the primary path; Infisical is a drop-in alternative if you prefer it.

---

## 10. References

- [Doppler CLI](https://docs.doppler.com/docs/cli)
- [Doppler Service Tokens](https://docs.doppler.com/docs/service-tokens)
- [SECRETS_AND_ENV.md](SECRETS_AND_ENV.md) – overall secrets strategy and options
- [ENVIRONMENTS_DEV_STAGE_PROD.md](ENVIRONMENTS_DEV_STAGE_PROD.md) – how dev/stage/prod and branches are used
