# Storing and Sharing Secrets (Dev, Stage, Prod)

This doc describes how to keep API keys and other secrets safe and how to share them across **dev**, **staging**, and **production** without committing them to git.

**We use Doppler as the secret manager.** For step-by-step setup (install, create project/configs, local and server usage), see **[SECRET_MANAGER_SETUP.md](SECRET_MANAGER_SETUP.md)**.

---

## 1. Critical: Never Commit Secrets

- **`.env`**, **`.env.local`**, and **`env.local`** are in `.gitignore`. Do not remove them.
- If you keep secrets in a file named **`env.local`** (no leading dot), that file is now ignored too. Prefer **`.env`** or **`.env.local`** so standard tooling and other devs expect it.
- If `env.local` was ever committed to git, treat those secrets as **compromised**: rotate every key (Twilio, API keys, tokens, etc.) and remove the file from history (e.g. `git filter-branch` or BFG) or use a fresh repo.

---

## 2. Where Secrets Live Today

| Location | Use |
|----------|-----|
| **Local** | `.env` or `.env.local` or `env.local` in the project root — for `npm run dev` and local runs. Load via shell (`source .env` / `export $(grep -v '^#' .env | xargs)`) or a dotenv loader if you add one. |
| **Staging server** | `.env` (or equivalent) in the staging app directory (e.g. `/opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai`). Set once, then use `pm2 restart … --update-env` after changes. |
| **Production server** | Same idea: `.env` in the prod app directory. Only prod secrets and prod DB. |

The app reads **`process.env.*`**; it does not care whether env came from a file or from the host/process manager. So “sharing” = getting the right set of variables onto each environment without putting them in the repo.

---

## 3. Safe Ways to Store and Share Between Dev / Stage / Prod

### Option A: Secret manager (recommended for teams)

Use a **secret manager** as the single source of truth. Each environment (dev / stage / prod) has its own config or project so you can share structure but keep different values (e.g. different DB URLs, Twilio keys, or API keys).

| Tool | Idea | Dev | Stage | Prod |
|------|------|-----|--------|------|
| **[Doppler](https://www.doppler.com/)** | Sync env by project + config | CLI: `doppler run -- npm run dev` | Inject at deploy: `doppler run --config staging -- npm start` or write to `.env` on server | Same, with `--config production` |
| **[Infisical](https://infisical.com/)** | Open source, self‑host or cloud | CLI or SDK loads env | Deploy script pulls staging secrets into server env or file | Same for prod config |
| **[1Password Secrets Automation](https://developer.1password.com/docs/cli/)** | Env from 1Password vaults | `op run -- npm run dev` | In CI/deploy: `op run --env-file=.env -- ./deploy.sh` | Separate vault or item for prod |
| **GCP Secret Manager** | If you’re on Google Cloud | Same project, different secret versions or labels | Same | Prod project or labels |

**Benefits:** One place to rotate secrets; access control and audit; same variable names across envs with different values; no env files in repo.

**Flow:** Developer gets dev secrets via CLI (e.g. `doppler run -- npm run dev`). Staging/prod get secrets at deploy time (e.g. Doppler injects into the process or writes a temporary `.env` on the server).

---

### Option B: Encrypted env files (no secret manager)

Keep one file per environment in a **private, secure** place (not in the repo):

- **`.env.dev`** – local/dev
- **`.env.stage`** – staging
- **`.env.prod`** – production

**Ways to “share” safely:**

1. **Encrypt the files** (e.g. with [sops](https://github.com/getsops/sops) or [age](https://github.com/FiloSottile/age)) and store the encrypted blobs in a private repo or shared drive. Only people with the decryption key can use them. In deploy, decrypt to `.env` on the server.
2. **Store in a password manager** (1Password, Bitwarden) as secure notes or documents. Developers and deploy scripts copy the right one into `.env` (or paste into the server’s env config) when needed.
3. **Private “secrets” repo** with very limited access. Clone only on your machine or a deploy runner; copy the right file to the app directory. Still never commit unencrypted prod secrets to the main app repo.

---

### Option C: Platform / server env only (what you’re close to now)

No shared store: each environment is configured once by hand (or by a one‑time script):

- **Dev:** You (or each dev) creates `.env` or `.env.local` from `.env.example` and fills in dev keys (or copies from a secure stash).
- **Stage:** On the staging server, create or edit `.env` in the staging app dir with staging DB, staging Twilio, etc. Use `pm2 restart … --update-env` after changes.
- **Prod:** Same on the prod server with prod values.

**Sharing** = sending the right list of variable names and (through a secure channel) the values, then typing or pasting them into the server. To avoid mistakes, keep a checklist (e.g. in `docs/deployment/`) of every variable each env needs; values stay out of the repo.

---

## 4. Recommended Layout for This Repo

1. **Rename `env.local` → `.env.local`** (or merge into `.env`) so:
   - It’s ignored by the existing `.gitignore` (`.env.local` is already there).
   - Other tools (e.g. Vite `loadEnv`) that look for `.env*` can use it if you run from the repo root.

2. **Use `.env.example` as the template** (already in repo). It lists every variable with placeholder values. New devs copy it to `.env` or `.env.local` and fill in real values from a secure source.

3. **Choose one of the approaches above** for sharing:
   - **Small team / simple:** Option C plus a secure checklist; optionally move to Option B (encrypted or password‑manager‑stored env files).
   - **Team / multiple envs:** Option A (Doppler, Infisical, or 1Password) so dev/stage/prod each have their own config and nothing lives in the repo.

4. **Staging and prod:** Never commit their `.env`. On the server, the deploy script (e.g. `deploy-staging.sh`) only pulls code and runs build; env is already on the server (or injected by your secret manager during deploy).

---

## 5. Checklist: “Secrets are safe and shared”

- [ ] No file containing real secrets is tracked in git (check `git status` and `.gitignore`).
- [ ] Dev runs with env from a local `.env` / `.env.local` or from a secret manager.
- [ ] Staging and prod have their own env (on the server or from a secret manager), with the right `DATABASE_URL`, `TWILIO_*`, `GOOGLE_*`, etc.
- [ ] If you use a secret manager, deploy or start commands inject the correct config (e.g. `doppler run --config staging -- npm start`).
- [ ] Rotate any secret that may have been committed in the past (e.g. old `env.local`).

---

## 6. References

- **[SECRET_MANAGER_SETUP.md](SECRET_MANAGER_SETUP.md)** – Doppler setup for this repo (install, configs, dev/staging/prod)
- [Doppler](https://www.doppler.com/) – secret manager with CLI and env sync
- [Infisical](https://infisical.com/) – open source secret management
- [1Password CLI / Secrets Automation](https://developer.1password.com/docs/cli/) – env from 1Password
- **[SECRET_MANAGER_SETUP.md](SECRET_MANAGER_SETUP.md)** – Doppler setup for this repo (install, configs, dev/staging/prod)
- [ENVIRONMENTS_DEV_STAGE_PROD.md](./ENVIRONMENTS_DEV_STAGE_PROD.md) – how dev/stage/prod and branches are used in this project
