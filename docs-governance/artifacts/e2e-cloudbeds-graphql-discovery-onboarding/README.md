# E2E proof output (local only)

This folder holds **timestamped logs** produced by:

`doppler run --config dev -- npm run e2e:cloudbeds-graphql-discovery-onboarding-proof`

Log files use the `*.log` pattern and are **gitignored** (see root `.gitignore`). Commit **this README** and the script; do **not** commit proof logs (they may contain tenant metadata).

## Auth (critical)

- **`E2E_ADMIN_BEARER_TOKEN`** must be a **platform admin** session token (`auth_sessions`), same as Bearer auth for `/api/site-configs/*` with `requireAuth`.
- **Do not** use **`CLOUDBEDS_CLIENT_API_KEY`** (or any Cloudbeds vendor API key) as the Bearer token — that key is for **PMS HTTP**, not admin session auth; integration-onboarding routes will return **401**.

## Site id (Boardwalk Suites Lafayette)

**Canonical identifier:** `site_configs.id` (UUID). Set **`BOARDWALK_SITE_CONFIG_ID`** or **`E2E_SITE_CONFIG_ID`** to that value (from `npm run setup:boardwalk` or admin API).

Google `place_id` is **not** platform identity. A **migration-only** shim exists for local/dev (`GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP=1`, non-production); it is blocked in production and scheduled for removal — see [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](../../canonical/SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md) and [`scripts/lib/boardwalkSiteIdentity.ts`](../../../scripts/lib/boardwalkSiteIdentity.ts).

For methodology and acceptance criteria, see:

[`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md`](../../canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md) — **Operational status** and HTTP sections.
