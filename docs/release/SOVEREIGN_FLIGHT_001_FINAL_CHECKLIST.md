# Sovereign Main-Branch Merger — Flight 001 Final Checklist

**Release:** v1.0.0-SOVEREIGN-ALPHA  
**Date:** 2026-02-28  
**Role:** Lead Release Engineer & Sovereign Architect  

---

## Gate 0 — Pre-Flight Check

| Check | Status | Notes |
|-------|--------|--------|
| **Manifest Integrity** | PASS | `npm run check-env-manifest` — All keys from .env.example documented in SOVEREIGN_ENV_MANIFEST.md. |
| **Handshake Proof** | MANUAL | `npm run test:nova-handshake` requires Doppler token and running server. **Operator must run locally:** `doppler run -- npm run test:nova-handshake` and confirm 200 OK (signature, DB update, email sent, 10-item invoice) before treating release as verified. |

---

## Gate 1 — Perimeter Audit

| Check | Status | Notes |
|-------|--------|--------|
| **.gitignore** | PASS | `.env`, `.env.local`, `.env.production`, `.env.staging`, `.env.*.local`, `env.local`, `.cursor/mcp.json` — strictly ignored. CTO warning present. |
| **Sentinel** | PASS | `server/index.ts` calls `validateSovereignEnv()` at startup (and `validateSovereignEnv(PROGRAMMATIC_EMAIL_CANONICAL_KEYS)` when ENABLE_GOOGLE_WORKSPACE=true). `server/routes/healthRoutes.ts` calls `checkSovereignEnv()` in GET /api/health. |

---

## Gate 2 — Documentation Anchor

| Check | Status | Notes |
|-------|--------|--------|
| **SOVEREIGN_ENV_MANIFEST.md** | PASS | Included in commit. |
| **GITHUB_SECRET_MANIFEST.md** | PASS | Included in commit. |
| **Programmatic Identity** | PASS | `docs/integrations/PLATFORM_EMAIL_SERVICE_ACCOUNT.md` — ai-biz-bot-emailer, GCP + Workspace DWD + Doppler One-Time Handshake fully documented. |

---

## Merge Execution

- Merge current Sovereign Alignment, Doppler–GitHub Bridge, and Handshake Test into `main`.
- Tag: **v1.0.0-SOVEREIGN-ALPHA**.

---

## Post-Merger Reality (Keanu "Executive" Review)

| Pillar | Why it's "Billion-Dollar Solo" |
|--------|---------------------------------|
| **Integrity** | Self-validating build: undocumented env vars fail `check-env-manifest` before production. |
| **Authority** | Doppler–GitHub sync: production is a read-only mirror of the Vault; no manual secret avalanche. |
| **Trust** | Signed handshakes: B2B partners get cryptographic certainty via X-Nova-Signature and Nova IDV stack. |

---

## Post-Merge Verification (Operator)

1. Checkout `main` and pull.
2. Set `DOPPLER_TOKEN` (or `DOPPLER_TOKEN_DEV`) in local `.env`.
3. Start server: `doppler run -- npm run dev`.
4. In another terminal: `doppler run -- npm run test:nova-handshake`.
5. Confirm: **200 OK. Signature Valid. DB Updated. Email Sent. Invoice Generated. NO EXCEPTIONS.**
