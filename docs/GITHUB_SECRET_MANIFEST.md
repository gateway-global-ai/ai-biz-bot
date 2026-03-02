# GitHub Secret Manifest — Doppler–GitHub Bridge

**NOVA Sovereign Bridge.** This document defines the hierarchy of truth for secrets and forbids agents from writing or renaming GitHub Secrets. See [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md) for naming and runtime rules.

---

## 1. Source of truth

- **Doppler dashboard is the Vault.** All secret *values* and *names* are managed in Doppler. No manual copying of values into GitHub.
- **GitHub Secrets are a read-only reflection.** When the Doppler GitHub Integration is enabled, Doppler syncs secrets one-way (Doppler → GitHub). GitHub does not push back. Do not edit secret values in the GitHub UI when sync is active; changes must be made in Doppler.

---

## 2. Role of .env.example

- **Documentation only.** `.env.example` lists canonical key names and tells developers where to find them (Doppler). It does **not** drive production or CI.
- Changes to `.env.example` still require a **Signature Check** against [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md) and `npm run check-env-manifest`. The file remains the naming baseline; the value source is Doppler.

---

## 3. Who may write secrets

- **Doppler:** Writes GitHub Secrets via the GitHub Integration. Only Doppler (and the integration) should create, update, or delete repository/environment secrets that are synced from Doppler.
- **Agents and contributors:** Must **not** be granted write access to repository secrets (or environment secrets) that are synced from Doppler. They add or rename keys only by (a) updating the Doppler dashboard and (b) updating `.env.example` and the Sovereign Manifest per existing rules. They must **not** create, rename, or delete GitHub Secrets or GitHub Variables that are part of the Doppler sync.

---

## 4. How to add or rename a key

1. Add (or rename) the key in **Doppler** in the correct config (dev/stg/prd).
2. Update [.env.example](../.env.example) and [docs/SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md) (and the manifest allow-list if used).
3. Run `npm run check-env-manifest`.
4. Do **not** create or edit GitHub Secrets manually when the Doppler–GitHub sync is active; Doppler will sync the change.

---

## 5. CI/CD consumption

- **Preferred:** GitHub Actions (and Codespaces/Dependabot if used) read from **GitHub Secrets** (and/or Variables) populated by Doppler via the integration.
- **Alternative:** Actions use `doppler run -- ...` with a single GitHub secret holding a Doppler service token; Doppler injects the rest at runtime.
- Document which approach this repo uses so agents do not add redundant or conflicting secret wiring.

---

## 6. Agent rules (summary)

- **Do not** write, rename, or delete GitHub Secrets or GitHub Variables that are synced from Doppler.
- **Do not** add new env keys to production paths without updating the Sovereign Manifest and `.env.example`.
- When editing workflows or env-related docs, follow [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md) and this bridge manifest.
- See [.cursor/rules/github-doppler-bridge.mdc](../.cursor/rules/github-doppler-bridge.mdc) for the Cursor rule that enforces this.

---

## 7. Three Gates (reference)

- **Gate 0 (Documentation Fortress):** This manifest and the Cursor rule lock the bridge in documentation; agents are forbidden from writing GitHub Secrets.
- **Gate 1 (Perimeter Guard):** `.env`, `.env.production`, `.env.staging`, and other real env files are in `.gitignore`; only `.env.example` is committed (documentation only).
- **Gate 3 (Constitutional Anchor):** The Sovereign Runtime Guard (`validateSovereignEnv()`) is the final boss; the server hard-fails at startup when required keys are missing (when `SOVEREIGN_ENV_STRICT=true`). See [SOVEREIGN_ENV_MANIFEST.md](SOVEREIGN_ENV_MANIFEST.md).
