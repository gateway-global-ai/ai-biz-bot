# Dev / Stage / Prod Environments

Yes — **dev**, **stage**, and **prod** is the right configuration for shipping the MVP. This doc defines how each environment is used and how they stay in sync.

**Architecture:** For the three-pillar setup (Doppler + PM2 + Nginx) and how it fixes port collisions, instruction drift, and 1006 WebSocket issues, see **[DECOUPLED_ENVIRONMENT_STRATEGY.md](DECOUPLED_ENVIRONMENT_STRATEGY.md)**.

---

## 1. Overview

| Environment | Purpose | Where it runs | Branch | Deploy when |
|-------------|---------|----------------|--------|-------------|
| **Dev** | Day-to-day coding, experiments, debugging | Your machine (Cursor) | Any branch (often `main` or feature branches) | N/A (local) |
| **Stage** | Final testing before release; QA, stakeholders, demos | Staging server (same VPS or separate) | `stage` | After merging from `main` (or from feature branches) when you want a release candidate |
| **Prod** | Live site and API; real users | Production server | `main` | After stage is signed off; merge `stage` → `main` and deploy `main` |

**Flow:** Develop locally (dev) → push to `stage` and deploy to staging → test → merge `stage` into `main` and deploy `main` to prod.

**Deploy the current stable version (prod):** On the production server run  
`cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai && ./script/deploy-server.sh aibizbot.gatewayglobal.ai`  
This pulls `main`, builds, and restarts the app at **https://aibizbot.gatewayglobal.ai** (port 3002).

---

## 2. What each environment is for

- **Dev (local)**  
  - Run the app on your machine (`npm run dev`).  
  - Use `.env` (or `.env.local`) with dev credentials; point at local or shared dev DB if needed.  
  - No formal “deploy”; you pull/push via Git and run locally.

  - **Secrets:** See [SECRETS_AND_ENV.md](SECRETS_AND_ENV.md) for safe storage and sharing across dev/stage/prod.

- **Stage (staging)**  
  - Mirrors production (same stack, similar config) but with a **staging URL** and **staging data** (e.g. staging DB, test Twilio number).  
  - Used for final testing, QA, and stakeholder sign-off before going live.  
  - Deployed from the **`stage`** branch so that only approved release candidates are tested here.

- **Prod (production)**  
  - Live app and API (e.g. **https://aibizbot.gatewayglobal.ai**).  
  - Deployed from **`main`** only after stage has been tested and approved.  
  - Uses production `.env` (secrets, prod DB, real Twilio, etc.).

---

## 3. Branch strategy

- **`main`** = production. Only code that has been through stage and is ready for release.
- **`stage`** = staging. Updated when you want a new release candidate (e.g. merge `main` → `stage`, or merge a feature branch into `stage` for testing).
- **Feature branches** (optional): e.g. `feature/xyz`. Merge into `stage` for testing, then `stage` → `main` when ready for prod.

**Typical release:**

1. Work on `main` (or a feature branch) in Cursor → push to GitHub.
2. When you want a release candidate: merge `main` into `stage`, push `stage`, then deploy the **stage** branch to the staging server.
3. Test on staging (URL below). Fixes can be done on `stage` or on `main` and then merged into `stage`.
4. When staging is good: merge `stage` into `main`, push `main`, then deploy **main** to the production server.

Keep `stage` on GitHub so the staging server can pull it:

```bash
git checkout stage
git merge main
git push origin stage
```

---

## 4. Subdomains, ports, and server layout (VPS)

Use one subdomain per environment. Each has its own port, app directory, and `.env` (see [server_deployment.md](server_deployment.md)).

| Environment | Subdomain | Port | App path |
|-------------|-----------|------|----------|
| **Prod** | aibizbot.gatewayglobal.ai | 3002 | /opt/gatewayglobal/aibizbot.gatewayglobal.ai |
| **Stage** | aibizbot-stage.gatewayglobal.ai | 3003 | /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai |
| **Dev** (optional) | aibizbot-dev.gatewayglobal.ai | 3004 | /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai |

**DNS:** Point each subdomain (A record) to the VPS IP (e.g. 72.61.4.44). Then add an Nginx server block and run Certbot for each hostname.

**PM2:** **`ecosystem.config.cjs`** lists stage / dev / prod app names (each server runs the matching `cwd`); deploy scripts use **`script/lib/pm2-reload-app.sh`**.

- **Prod:** Deploy from `main`. This is the current stable app (see [DEPLOY_VPS_AIBIZBOT.md](DEPLOY_VPS_AIBIZBOT.md)).
- **Stage:** Deploy from `stage`. In staging `.env`: `PORT=3003`, `WEBHOOK_BASE_URL=https://aibizbot-stage.gatewayglobal.ai`, staging DB and test Twilio if desired.
- **Dev:** Either (1) local only — run `npm run dev` on your machine (e.g. localhost:5000), or (2) optional shared dev server on VPS — deploy any branch to aibizbot-dev; in `.env`: `PORT=3004`, `WEBHOOK_BASE_URL=https://aibizbot-dev.gatewayglobal.ai`.

**First-time setup (stage + dev on VPS):** [DEPLOY_STAGE_AND_DEV_CHECKLIST.md](DEPLOY_STAGE_AND_DEV_CHECKLIST.md) has step-by-step copy-paste commands.

---

## 5. Environment variables per environment

- **Dev:** `.env` (gitignored) — copy from `.env.example`; use local or dev DB, dev API keys / test Twilio where possible.  
- **Stage:** `.env` on the staging server only — same keys as `.env.example` but with staging URLs, staging DB, test telephony.  
- **Prod:** `.env` on the production server only — production URLs, prod DB, real Twilio, etc.

Never commit `.env` files. Use [.env.example](../../.env.example) as the single checklist of variable names; only the values differ by environment.

| Variable | Dev | Stage | Prod |
|----------|-----|--------|------|
| NODE_ENV | development | production (or staging) | production |
| PORT | 5000 (local) or 3004 (VPS dev) | 3003 | 3002 |
| WEBHOOK_BASE_URL | http://localhost:5000 or https://aibizbot-dev.gatewayglobal.ai | https://aibizbot-stage.gatewayglobal.ai | https://aibizbot.gatewayglobal.ai |
| DATABASE_URL | local/dev DB | staging DB | prod DB |
| Twilio / API keys | dev/test where possible | test keys / numbers | production keys |

---

## 6. How to deploy stage vs prod

- **Staging** (aibizbot-stage.gatewayglobal.ai, port 3003):  
  - App path: `/opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai`. Run the **staging deploy script** (pulls **`stage`** branch):
    ```bash
    cd /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai
    chmod +x script/deploy-staging.sh
    ./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai
    ```

- **Production** (aibizbot.gatewayglobal.ai, port 3002):  
  - App path: `/opt/gatewayglobal/aibizbot.gatewayglobal.ai`. Pull **`main`** only. Use the [deploy script](../../script/deploy-server.sh):
    ```bash
    cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai
    ./script/deploy-server.sh aibizbot.gatewayglobal.ai
    ```
  - **To deploy the current stable version:** ensure `main` has the desired code, then run the command above on the prod server.

---

## 7. Quick reference

| Action | Where | Command / note |
|--------|--------|----------------|
| Develop | Cursor (local) | Work on `main` or a feature branch; `npm run dev` |
| Put a release candidate on stage | Local | `git checkout stage && git merge main && git push origin stage` |
| Deploy to staging | Staging server | `cd /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai && ./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai` |
| Promote to prod | Local | `git checkout main && git merge stage && git push origin main` |
| Deploy to prod (current stable) | Production server | `cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai && ./script/deploy-server.sh aibizbot.gatewayglobal.ai` |

---

## 8. Optional: CI/CD later

When you add GitHub Actions (or similar), you can:

- On push to `stage`: deploy to staging.  
- On push to `main`: deploy to prod (or only when a tag like `v1.0.0` is pushed).

Until then, manual deploy after pull is enough and matches the flow above.
