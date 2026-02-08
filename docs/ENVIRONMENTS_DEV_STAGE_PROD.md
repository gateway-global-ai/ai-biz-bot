# Dev / Stage / Prod Environments

Yes — **dev**, **stage**, and **prod** is the right configuration for shipping the MVP. This doc defines how each environment is used and how they stay in sync.

---

## 1. Overview

| Environment | Purpose | Where it runs | Branch | Deploy when |
|-------------|---------|----------------|--------|-------------|
| **Dev** | Day-to-day coding, experiments, debugging | Your machine (Cursor) | Any branch (often `main` or feature branches) | N/A (local) |
| **Stage** | Final testing before release; QA, stakeholders, demos | Staging server (same VPS or separate) | `stage` | After merging from `main` (or from feature branches) when you want a release candidate |
| **Prod** | Live site and API; real users | Production server | `main` | After stage is signed off; merge `stage` → `main` and deploy `main` |

**Flow:** Develop locally (dev) → push to `stage` and deploy to staging → test → merge `stage` into `main` and deploy `main` to prod.

---

## 2. What each environment is for

- **Dev (local)**  
  - Run the app on your machine (`npm run dev`).  
  - Use `.env` (or `.env.local`) with dev credentials; point at local or shared dev DB if needed.  
  - No formal “deploy”; you pull/push via Git and run locally.

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

## 4. URLs and server layout (VPS)

Use one subdomain per environment so each has a clear URL and its own `.env` (see [server_deployment.md](server_deployment.md)).

| Environment | Hostname (example) | Port (example) | App path (example) |
|-------------|--------------------|----------------|--------------------|
| **Prod** | aibizbot.gatewayglobal.ai | 3002 | /opt/gatewayglobal/aibizbot.gatewayglobal.ai |
| **Stage** | stage.gatewayglobal.ai or aibizbot-stage.gatewayglobal.ai | 3003 | /opt/gatewayglobal/stage.gatewayglobal.ai |

- **Prod:** Already defined (see [DEPLOY_VPS_AIBIZBOT.md](DEPLOY_VPS_AIBIZBOT.md)).  
- **Stage:** Create a second app directory, Nginx server block, and SSL for the staging hostname; use a different port (e.g. 3003) and set in staging `.env`:
  - `PORT=3003`
  - `NODE_ENV=production` (or `staging` if you ever branch on it in code)
  - `WEBHOOK_BASE_URL=https://stage.gatewayglobal.ai` (or your chosen staging URL)
  - Staging DB and test Twilio/SMS if you want to avoid touching prod.

---

## 5. Environment variables per environment

- **Dev:** `.env` (gitignored) — copy from `.env.example`; use local or dev DB, dev API keys / test Twilio where possible.  
- **Stage:** `.env` on the staging server only — same keys as `.env.example` but with staging URLs, staging DB, test telephony.  
- **Prod:** `.env` on the production server only — production URLs, prod DB, real Twilio, etc.

Never commit `.env` files. Use [.env.example](../.env.example) as the single checklist of variable names; only the values differ by environment.

| Variable | Dev | Stage | Prod |
|----------|-----|--------|------|
| NODE_ENV | development | production (or staging) | production |
| PORT | 5000 (or your choice) | 3003 | 3002 |
| WEBHOOK_BASE_URL | http://localhost:5000 | https://stage.gatewayglobal.ai | https://aibizbot.gatewayglobal.ai |
| DATABASE_URL | local/dev DB | staging DB | prod DB |
| Twilio / API keys | dev/test where possible | test keys / numbers | production keys |

---

## 6. How to deploy stage vs prod

- **Staging server** (e.g. `/opt/gatewayglobal/stage.gatewayglobal.ai`):  
  - Clone once (or copy the repo), then run the **staging deploy script** so it always pulls the **`stage`** branch and restarts the staging PM2 app:
    ```bash
    cd /opt/gatewayglobal/stage.gatewayglobal.ai
    chmod +x script/deploy-staging.sh
    ./script/deploy-staging.sh stage.gatewayglobal.ai
    ```
  - Or do the steps manually:
    ```bash
    cd /opt/gatewayglobal/stage.gatewayglobal.ai
    git fetch origin
    git checkout stage
    git pull origin stage
    npm ci --omit=dev
    npm run build
    pm2 restart stage.gatewayglobal.ai
    ```

- **Production server** (e.g. `/opt/gatewayglobal/aibizbot.gatewayglobal.ai`):  
  - Pull **`main`** only. Use the existing [deploy script](../script/deploy-server.sh) or the steps in [SETUP_GITHUB_HOSTINGER_CURSOR.md](SETUP_GITHUB_HOSTINGER_CURSOR.md).

---

## 7. Quick reference

| Action | Where | Command / note |
|--------|--------|----------------|
| Develop | Cursor (local) | Work on `main` or a feature branch; `npm run dev` |
| Put a release candidate on stage | Local | `git checkout stage && git merge main && git push origin stage` |
| Deploy to staging | Staging server | `./script/deploy-staging.sh stage.gatewayglobal.ai` (see §6) |
| Promote to prod | Local | `git checkout main && git merge stage && git push origin main` |
| Deploy to prod | Production server | `./script/deploy-server.sh aibizbot.gatewayglobal.ai` |

---

## 8. Optional: CI/CD later

When you add GitHub Actions (or similar), you can:

- On push to `stage`: deploy to staging.  
- On push to `main`: deploy to prod (or only when a tag like `v1.0.0` is pushed).

Until then, manual deploy after pull is enough and matches the flow above.
