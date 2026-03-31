---
status: canonical
truth_domain: governance
enforced_by: implementation (pending)
backed_by:
  schema: proposed
  service: proposed
  route: proposed
last_verified: 2026-03-28
spec_id: integration_operator_connect_flow
spec_version: "1.0.0"
---

# Integration operator connect flow (V1) — implementation spec

## Purpose

Server-side PMS/vendor authorization already exists (platform-owned credentials, Cloudbeds OAuth start/callback, signed OAuth state, `site_pms_integrations`). **Guests and models must never handle vendor secrets.**

This spec defines the **smallest governed product slice** that closes the operator loop:

1. **Invite** the business operator (human-in-the-loop).
2. **Establish identity** without treating a raw SMS link as a full login.
3. Land on a **narrow owner web surface** (V1: web-first; PTT/canvas integration later).
4. Complete **OAuth** and/or **API key + property ID** submission (server-side persistence only).
5. Show **completion / failure** state and **audit**.

Non-goals for V1: voice hot-path changes, customer Concierge idle UX, broad browser gateway (`/canvas/*` resolver) — see [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) M2.

## Core invariant

> A connect token grants **only** short-lived **integration-connect authority** for **one** `siteConfigId`, **one** vendor (e.g. `cloudbeds`), and **one** `connect_lane`. It is **not** general customer auth, not reusable operator session, not a substitute for Nova OTP flows for end users.

**Extraction / verification:** Credential and OAuth flows MUST follow [`USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md`](./USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md) **Tier 3** — immediate vendor smoke test and explicit success/failure before marking connected; agent-assisted debugging on failure, no silent “save and check later.”

## Logical route

| Field | Value |
|-------|--------|
| `routeId` | `operator.integration.connect` |
| `domain` | `integration` |
| `requiredContextKeys` | `siteConfigId` (after token resolution); `vendorId` |
| `requiredRoleScope` | operator / owner attested via connect token (not public) |
| `policyGate` | token valid, unexpired, unused; vendor allowlist |
| `renderMode` | `owner_web` (V1) |
| `linkedViewId` | `integration_connect_surface` (to be registered in [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) when UI lands) |
| `optionalBrowserPath` | `/connect/cloudbeds` (adapter; server remains authority) |

## Token model (proposed)

### Table: `integration_connect_tokens` (name may be prefixed per migration discipline)

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `site_config_id` | uuid FK → `site_configs.id` | Required |
| `vendor_id` | text | e.g. `cloudbeds` — **must** match allowlist |
| `connect_lane` | text | `oauth` \| `api_key` — which completion path the UI/API accepts (extensible for other PMS) |
| `phone_e164` | text nullable | Target operator phone (for audit / mismatch warning); **not** sole verifier |
| `token_hash` | text unique | Store **hash** of opaque token only (same pattern as OAuth state signing — see [`server/services/cloudbedsApi.ts`](../../server/services/cloudbedsApi.ts) `signOAuthState`) |
| `expires_at` | timestamptz | Short TTL (recommended **15–60 minutes**; configurable) |
| `used_at` | timestamptz nullable | Single-use: set when consumed or exchanged |
| `created_at` | timestamptz | |
| `created_by` | text nullable | `system` \| `admin_user_id` \| job name — audit |

**Rules**

- Mint: cryptographically random opaque token → persist **HMAC-SHA256 hash** only (`INTEGRATION_CONNECT_TOKEN_SECRET`); return once in SMS URL. Implementation: [`server/services/integrationConnectTokens.ts`](../../server/services/integrationConnectTokens.ts).
- Validate: returns a **structured** result (deterministic for UI + audit): `valid` \| `invalid` \| `expired` \| `already_used` \| `site_mismatch` \| `vendor_mismatch` (optional `expectSiteConfigId` / `expectVendorId` on validate).
- Single-use: mark `used_at` via `markIntegrationConnectTokenUsed` after **session exchange** or OAuth start (see spec flow).

### Optional follow-on (V2+)

- Rate limits per `site_config_id` + per `phone`.
- Row-level “revoke all pending for site”.

## HTTP surfaces (V1)

All new routes in **`server/routes/`** modular files; **mount only** in [`server/routes.ts`](../../server/routes.ts) (or existing mount pattern). No new routes inside the legacy monolith body.

### Public owner entry (browser adapter)

| Method | Path | Role |
|--------|------|------|
| `GET` | `/connect/cloudbeds` | Query: `token` (opaque). Validates token, sets **narrow session**, redirects to same path without token or serves SPA shell. |

**Narrow session options (pick one in implementation; document choice):**

1. **HttpOnly cookie** — `connect_sid` bound to `token_hash` + `site_config_id` + `vendor_id` + short TTL; cleared after OAuth completes or on logout.
2. **One-shot server session store** (Redis/DB) — exchange token once for internal session id.

**Forbidden:** passing the raw query token to `/api/cloudbeds/oauth/start` on every request without server-side validation.

### API — token mint (internal / admin / job only)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/integration/connect/mint` | **Implemented:** `INTEGRATION_CONNECT_MINT_SECRET` via header `X-Integration-Connect-Mint` or `Authorization: Bearer` — **not** public (operator / job only) |

Body (example): `{ "siteConfigId", "vendorId": "cloudbeds", "connectLane": "oauth" | "api_key", "phoneE164"?: string }`  
Response: `{ "connectUrl": "https://…/connect/cloudbeds?token=…", "expiresAt" }` — URL **once**; not logged in plaintext.

### API — governance context (browser adapter authority)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/integration/connect/governance-context` | None — returns canonical `logicalRouteId` (`operator.integration.connect`), `viewId` (`integration_connect_surface`), `browserAdapterPath`, and optional `session` echo when the HttpOnly connect cookie is present |

The SPA adapter at `/connect/cloudbeds` must call this **before** treating the surface as valid; the browser path is not routing authority.

### API — OAuth start bridge

Existing: [`GET /api/cloudbeds/oauth/start`](../../server/routes/cloudbedsRoutes.ts) uses `requireCustomerAuth` + site ownership.

**V1 change:** Allow start when **either**:

- Current behavior: authenticated customer owns `siteConfigId`, or  
- **Valid narrow connect session** cookie/session for same `siteConfigId` + `vendor_id === cloudbeds`.

Implementation: shared guard `assertCloudbedsOAuthStartAllowed(req, siteConfigId)`.

### Existing callback (unchanged contract)

- `GET /api/cloudbeds/oauth/callback` — continues to verify signed OAuth `state`, exchange code, write tokens to `site_pms_integrations`.

**UX:** After token exchange, redirect to **`/connect/cloudbeds?status=success`** (or error) — **not** raw JSON for browser flows. Keep JSON for API-only clients if needed (query flag or `Accept` header).

### API key lane (parallel track)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/integration/connect/cloudbeds/api-key` | Narrow connect session + `connect_lane === api_key` |

Body: `{ "apiKey": "…", "propertyId": "…" }` — server writes via storage layer; **never** echo secrets in responses or logs.

## Read-only display on connect surface

- **`CLOUDBEDS_CLIENT_CALLBACK_URL`** (or env-driven label) — **read-only** instructions: “Register this redirect URI in your Cloudbeds OAuth app.”
- Platform base URL for support docs — no secrets.

## SMS dispatch

- **All** outbound SMS via [`server/services/smsRouter.ts`](../../server/services/smsRouter.ts) `dispatchSms` — **no** direct `twilio.messages.create` from ad hoc routes.
- **Recommended intent for V1:** `SmsIntent.PLATFORM_CARE` — operational, owner-facing “complete your integration” messages (align with A2P registration; if a dedicated Messaging Service is required, open a compliance ticket before production scale).

Body template (example): short message + single HTTPS link to `/connect/cloudbeds?token=…` + compliance footer rules per intent.

## Success / error states (owner UI)

| State | Condition | UI |
|-------|-----------|-----|
| `pending` | Token valid, pre-OAuth | Show callback URL + “Connect with Cloudbeds” |
| `success` | `site_pms_integrations` has valid OAuth tokens or API key + property | “Connected”; show posture `connected` |
| `degraded` | Broker would return `CONNECTION_DEGRADED` | Explain + support |
| `expired_token` | Token TTL elapsed | “Request new link” |
| `used_token` | Already consumed | Same as expired or explicit message |
| `oauth_failed` | Callback exchange error | Sanitized message + retry |

## Audit events (proposed)

Emit structured events (table or append-only log) for:

- `integration_connect.minted` — `siteConfigId`, `vendorId`, `intent`, `createdBy` (no raw token).
- `integration_connect.opened` — token validated (hash id only).
- `integration_connect.session_bound` — narrow session issued.
- `integration_connect.oauth_completed` — `siteConfigId`, `vendorId`, `pmsRowId` optional.
- `integration_connect.api_key_saved` — never log key material.
- `integration_connect.failed` — reason code only.

Align failure vocabulary with [`shared/integrationExecution.ts`](../../shared/integrationExecution.ts) where applicable.

## Security checklist

- [x] Opaque token high entropy; store **HMAC hash** only ([`integrationConnectTokens`](../../server/services/integrationConnectTokens.ts) service).
- [ ] TTL short; single-use or single session exchange.
- [ ] OAuth start never callable for arbitrary `siteConfigId` without customer auth **or** valid connect session.
- [ ] Callback URL remains platform `CLOUDBEDS_CLIENT_CALLBACK_URL`; document per-environment.
- [ ] No secrets in Gemini tools, client bundle, or prompts.
- [ ] SMS link HTTPS only; no open redirects.

## Implementation order (normative)

1. ~~Migration + token mint/validate service.~~ **Done:** `migrations/0074_integration_connect_tokens.sql`, [`server/services/integrationConnectTokens.ts`](../../server/services/integrationConnectTokens.ts), `npm run test:integration-connect-tokens` (needs `INTEGRATION_CONNECT_TOKEN_SECRET`).
2. `GET /connect/cloudbeds` + narrow session + owner page (minimal React page).
3. Bridge `oauth/start` for connect session.
4. Callback redirect to success/failure page.
5. SMS mint integration + `dispatchSms`.
6. Audit writes.
7. API-key POST path (if in same sprint); else phase 2.

## Related

- [`USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md`](./USER_DATA_EXTRACTION_AND_VERIFICATION_V1.md) — governed RRVCCE model; Tier 3 smoke test + confirmation
- [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) — keep connect flow off voice hot path.
