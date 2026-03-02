---
name: sovereign-ai-devops
description: Maintains the Doppler–GitHub Sovereign Bridge with zero-drift integrity. Use when editing env, secrets, workflows, or infrastructure so agents never break the Vault or bypass the Sentinel.
---

# Sovereign AI DevOps Protocol

When working on this platform, you must maintain the Doppler–GitHub Sovereign Bridge with zero-drift integrity. Follow this protocol for any change that touches environment variables, secrets, GitHub workflows, or deployment.

---

## 1. The Vault Law (Source of Truth)

**You are FORBIDDEN from creating, editing, or renaming secrets in GitHub directly.**

- **Doppler is the primary Vault.** All secret values and names are managed in the Doppler dashboard.
- **GitHub Secrets are a read-only reflection** of Doppler (when the Doppler GitHub Integration is enabled). Only Doppler writes them.
- You may only **suggest** new keys by:
  1. Updating the placeholder in [.env.example](../../.env.example),
  2. Updating the [Sovereign Manifest](../../docs/SOVEREIGN_ENV_MANIFEST.md) (and allow-list if used),
  3. Adding the key in Doppler (dashboard); Doppler will sync to GitHub.
- Do **not** add workflow steps that create or overwrite GitHub Secrets (e.g. `gh secret set`) for keys managed by Doppler.

**Reference:** [docs/GITHUB_SECRET_MANIFEST.md](../../docs/GITHUB_SECRET_MANIFEST.md).

---

## 2. The Genetic Lock (.env.example)

Treat **.env.example** as the **Genetic Code** for the system.

- **Any modification to .env.example MUST be validated** by running `npm run check-env-manifest` before commit. If the check fails, fix the manifest or the .env.example so every key is documented.
- If a variable is **used in code but missing from the baseline** (.env.example / Sovereign Manifest), treat it as **SOVEREIGN_CONFIGURATION_ERROR**: add it to .env.example and the manifest, or remove/refactor the code. Do not leave drift.
- Naming must follow the Sovereign Manifest: UPPERCASE_SNAKE_CASE; canonical names only; VITE_ prefix for client-exposed vars; DOPPLER_TOKEN (two P's), not DOPLER or DOPPLER_DEV_TOKEN.

**Reference:** [docs/SOVEREIGN_ENV_MANIFEST.md](../../docs/SOVEREIGN_ENV_MANIFEST.md), [.cursor/rules/env-example-signature.mdc](../../.cursor/rules/env-example-signature.mdc).

---

## 3. The Bridge Manifest (Gate 2)

All production secrets are **write-protected** and synced via the Doppler GitHub Integration.

- If you detect **naming drift** (e.g. `DOPLER` instead of `DOPPLER`, or `DOPPLER_DEV_TOKEN` instead of `DOPPLER_TOKEN_DEV`), you **must prioritize Alignment over Implementation**. Fix the naming and documentation first; do not implement features on top of drifted names.
- Do not store `DOPPLER_TOKEN` / `DOPPLER_TOKEN_DEV` / `DOPPLER_TOKEN_STG` / `DOPPLER_TOKEN_PRD` in Doppler; they live only in each server's .env. The copy script and docs reflect this.

**Reference:** [docs/GITHUB_SECRET_MANIFEST.md](../../docs/GITHUB_SECRET_MANIFEST.md), [.cursor/rules/github-doppler-bridge.mdc](../../.cursor/rules/github-doppler-bridge.mdc).

---

## 4. The Sentinel Protocol (Gate 3)

You **must never bypass** `validateSovereignEnv()`.

- In production (**SOVEREIGN_ENV_STRICT=true**), the system **must hard-fail** at startup if any required pillar is missing. Do not disable the guard, skip it, or catch and ignore SOVEREIGN_CONFIGURATION_ERROR in production paths.
- Required keys are defined in [server/config/sovereignEnvGuard.ts](../../server/config/sovereignEnvGuard.ts) and [docs/SOVEREIGN_ENV_MANIFEST.md](../../docs/SOVEREIGN_ENV_MANIFEST.md). The Sentinel is the **Final Boss** of the system; treat it as non-negotiable. Expand the required list (e.g. for Gemini, RSA, Stripe) in the guard and manifest if the product mandates more pillars.

**Reference:** [docs/SOVEREIGN_ENV_MANIFEST.md](../../docs/SOVEREIGN_ENV_MANIFEST.md) (Gate 3: Sovereign Runtime Guard), [server/config/sovereignEnvGuard.ts](../../server/config/sovereignEnvGuard.ts).

---

## Target Status

- **100% manifest parity:** Every key in code exists in .env.example and the Sovereign Manifest; no naming drift.
- **Absolute solo-employee sovereignty:** Only Doppler (and designated maintainers) write GitHub Secrets; agents never do.
- **Ignition:** Bridge locked. Gates 0, 1, 3 documented and enforced. Zero-drift future.

When in doubt, run `npm run check-env-manifest`, read [docs/GITHUB_SECRET_MANIFEST.md](../../docs/GITHUB_SECRET_MANIFEST.md) and [docs/SOVEREIGN_ENV_MANIFEST.md](../../docs/SOVEREIGN_ENV_MANIFEST.md), and prioritize alignment over new implementation.
