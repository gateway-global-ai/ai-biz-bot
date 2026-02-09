# GitHub, Hostinger/VPS, and Cursor Setup

This guide configures a clean sync between:

- **Cursor** (local) → your machine at `~/Documents/GitHub/chat-mvp-merge` (or your repo path)
- **GitHub** → single source of truth: `https://github.com/gateway-global-ai/chat-mvp-merge`
- **Server** → Hostinger VPS or Gateway Global VPS (e.g. aibizbot.gatewayglobal.ai for prod; optional staging hostname for **stage**)

For **dev / stage / prod** (local, staging, production), see [ENVIRONMENTS_DEV_STAGE_PROD.md](ENVIRONMENTS_DEV_STAGE_PROD.md).

---

## 1. Cursor workspace (local folder)

- **Open in Cursor:** File → Open Folder → choose the repo folder (e.g. `~/Documents/GitHub/chat-mvp-merge`). All work should happen in this folder so Git and GitHub stay in sync.
- **Terminal in Cursor:** Use the integrated terminal (Ctrl+` or Cmd+`) so `git` commands run in the repo root.
- **Don’t open a parent folder** (e.g. `Documents`) as the workspace; open the **repo root** so paths in this doc match.

---

## 2. Folder layout (where things live)

| Location   | Path / URL | Role |
|-----------|------------|------|
| **Cursor (local)** | `~/Documents/GitHub/chat-mvp-merge` (or your clone path) | Edit code; push to GitHub |
| **GitHub**         | `https://github.com/gateway-global-ai/chat-mvp-merge`       | Source of truth; `main` (or your default branch) |
| **Server (VPS)**   | `/opt/gatewayglobal/aibizbot.gatewayglobal.ai` (see [server_deployment.md](server_deployment.md)) | Run app; pull from GitHub |

- **Do all editing in Cursor** in the repo folder. Do not edit directly on the server except for `.env` and one-off fixes.
- **Never commit** `.env` or secrets (see [.env.example](../../.env.example)); keep them only on the server and in local `.env` (gitignored).

---

## 3. Git remote (GitHub)

Your repo should have `origin` pointing at GitHub.

**Check current remote:**

```bash
cd /Users/jasontrindade/Documents/GitHub/chat-mvp-merge
git remote -v
```

You should see:

```
origin  https://github.com/gateway-global-ai/chat-mvp-merge.git (fetch)
origin  https://github.com/gateway-global-ai/chat-mvp-merge.git (push)
```

**If you need to set or fix it:**

```bash
git remote remove origin   # only if you're replacing an existing origin
git remote add origin https://github.com/gateway-global-ai/chat-mvp-merge.git
git fetch origin
git branch -u origin/main main   # set local main to track origin/main
```

**Using SSH instead of HTTPS (optional, for push/pull without typing password):**

1. Add an SSH key to your GitHub account (Settings → SSH and GPG keys).
2. Then:

```bash
git remote set-url origin git@github.com:gateway-global-ai/chat-mvp-merge.git
git remote -v
```

---

## 3. Daily workflow: Cursor ↔ GitHub

**Before you start working (pull latest):**

```bash
cd /Users/jasontrindade/Documents/GitHub/chat-mvp-merge
git checkout main
git pull origin main
```

**After you finish a feature or fix (push to GitHub):**

```bash
git status
git add .
git commit -m "Short description of the change"
git push origin main
```

**If GitHub has changes you don’t have (e.g. “behind 6”):**

```bash
git pull origin main
# fix any merge conflicts if they appear, then:
git push origin main
```

**Branch strategy:**

- **`main`** = production. The production server deploys from `main`.
- **`stage`** = staging. Use for release candidates and final testing before prod. See **[ENVIRONMENTS_DEV_STAGE_PROD.md](ENVIRONMENTS_DEV_STAGE_PROD.md)** for the full dev / stage / prod flow.
- For bigger features you can use a branch (e.g. `feature/ptt-ui`), merge into `stage` to test, then merge `stage` → `main` when ready for prod.

---

## 5. Server sync (Hostinger VPS or Gateway Global VPS)

The server should run the app from **one folder** and get updates by **pulling from GitHub** (or by you deploying a specific branch/tag). Do not edit app code on the server except in emergencies.

### 4a. If the server has SSH and Git (recommended)

**First-time setup on the server** (once per app/hostname):

1. SSH into the server (Hostinger: use the SSH credentials from the panel; Gateway VPS: use your key).

2. Create app directory (match [server_deployment.md](server_deployment.md)):

   ```bash
   sudo mkdir -p /opt/gatewayglobal/aibizbot.gatewayglobal.ai
   sudo chown $USER:$USER /opt/gatewayglobal/aibizbot.gatewayglobal.ai
   cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai
   ```

3. Clone the repo (use HTTPS or SSH, same as Cursor):

   ```bash
   git clone https://github.com/gateway-global-ai/chat-mvp-merge.git .
   git checkout main
   ```

4. Install, build, env:

   ```bash
   npm ci --omit=dev
   cp .env.example .env
   # Edit .env with production values (PORT, DATABASE_URL, API keys, etc.)
   npm run build
   npm run db:push   # if you use Drizzle
   ```

5. Run with PM2 (see [DEPLOY_VPS_AIBIZBOT.md](DEPLOY_VPS_AIBIZBOT.md)):

   ```bash
   pm2 start dist/index.cjs --name aibizbot.gatewayglobal.ai -i 1
   pm2 save && pm2 startup
   ```

**To sync after you push from Cursor:**

SSH into the server, then run the deploy script (from repo root on server):

```bash
cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai
chmod +x script/deploy-server.sh
./script/deploy-server.sh aibizbot.gatewayglobal.ai
```

Or do the steps manually:

```bash
cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai
git fetch origin
git checkout main
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart aibizbot.gatewayglobal.ai
```

Keep `.env` on the server; do not overwrite it with a file from GitHub.

### 4b. If you use Hostinger panel (no SSH / no Git)

- **Option A – Hostinger has Git:** Use Hostinger’s “Git” or “Deploy from repository” in the panel, point it at `https://github.com/gateway-global-ai/chat-mvp-merge`, branch `main`, and set the deploy path to the folder they assign (e.g. `domains/aibizbot.gatewayglobal.ai/public_html` or similar). Then build steps may be done via “Build command” in the panel or a deploy script.
- **Option B – FTP/File Manager:** Treat GitHub as source of truth. After `git push origin main`, export the repo (e.g. zip from GitHub or `git archive`), then upload the built app (e.g. `dist/` and `client` build output) via Hostinger File Manager or FTP. Not ideal; prefer SSH + git when possible.

---

## 5. Google Drive (optional)

If “drive” means **Google Drive** for docs or assets:

- **Don’t put the whole repo on Drive** for sync (risk of conflicts and path issues).
- **Do** use Drive for:
  - Design docs, specs, screenshots.
  - Backup of important config (e.g. export of `.env` names—not values—or a checklist).
- **Repo stays in** `~/Documents/GitHub/chat-mvp-merge` and syncs only via **Git** with GitHub; the server pulls from GitHub.

If you use the **Google Drive SDK** inside this project (e.g. `sdk/google-drive/`), keep API credentials in `.env` and out of Git (see [.env.example](../../.env.example)).

---

## 7. Quick reference

| Task | Where | Command / action |
|------|--------|-------------------|
| Edit code | Cursor (local repo folder) | Open project in Cursor |
| Save to GitHub | Local | `git add . && git commit -m "..." && git push origin main` |
| Get latest from GitHub | Local | `git pull origin main` |
| Deploy to server | Server (SSH) | `cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai && git pull origin main && npm ci --omit=dev && npm run build && pm2 restart ...` |
| Env / secrets | Local & server only | `.env` (never commit); copy from `.env.example` and fill in |

---

## 8. Resolving “ahead/behind” (e.g. ahead 7, behind 6)

If `git status` shows “ahead 7, behind 6”:

1. **Stash or commit your local work:**
   ```bash
   git status
   git add .
   git commit -m "WIP: local changes before sync"
   ```
2. **Pull and merge:**
   ```bash
   git pull origin main
   ```
3. **Fix conflicts** if any (edit files, then `git add` and `git commit`).
4. **Push:**
   ```bash
   git push origin main
   ```

After this, Cursor and GitHub are in sync; then run the server sync steps above so the server matches `main`.
