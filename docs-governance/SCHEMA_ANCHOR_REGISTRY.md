# Schema Anchor Registry

## Purpose
Define the real source-of-truth entities the OS is allowed to reason about before any domain concepts or UI abstractions are introduced.

## Approved anchors

### `customerAccounts`
- Primary key: `customerAccountId`
- Role: top-level account / ownership / billing / onboarding scope
- Key relationships:
  - owns `siteConfigs`
  - carries account type, onboarding, compliance, activation state

### `siteConfigs`
- Primary key: `siteConfigId`
- Role: business / workspace anchor
- Key relationships:
  - parent: `customerAccounts`
  - child/linked: `agents`, chat activity, business configuration

### `agents`
- Primary key: `agentId`
- Parent key: `siteConfigId`
- Role: runtime persona and behavior anchor

### `customers`
- Primary key: `customerId`
- Role: CRM / lead / customer record within business scope

### `novaIdvSessions`
- Primary key: `sessionId`
- Role: verification-session anchor

### `orders`
- Primary key: `orderId`
- Role: transaction / invoice / payment-related workflow anchor

### `inquiries`
- Primary key: `inquiryId`
- Role: intake and support workflow anchor

### `chatLogs`
- Primary key: `chatLogId`
- Role: conversation and audit activity anchor

### `verificationInstallationApiKeys`
- Primary key: `id` (uuid)
- Parent key: `siteConfigId` → `siteConfigs`
- Role: hashed installation secrets for `Authorization: Bearer` on `POST /api/v1/verification/guest/*` (remote OS / ISV); stores `key_prefix`, `secret_hash`, `permissions`, `revoked_at`
- Table: `verification_installation_api_keys`

### `verificationGatePassageEvents`
- Primary key: `id` (uuid)
- Parent key: `siteConfigId` → `siteConfigs` (nullable — retained for audit after site removal)
- Role: append-only **transparency** log for verification **HTTP** routes (all status codes) and async **`voice_session_connect`** events (`passage_kind` discriminator); `client_fingerprint_hash`, `auth_state`, optional `installation_key_id`, `rate_limited`
- Table: `verification_gate_passage_events`
- See: [`VERIFICATION_GATE_TRANSPARENCY.md`](VERIFICATION_GATE_TRANSPARENCY.md), [`VOICE_SESSION_TRANSPARENCY.md`](VOICE_SESSION_TRANSPARENCY.md)

## Rules
- New architecture work must map to these anchors first.
- Domain concepts may group or reinterpret anchors, but may not replace them as truth.
- No new entity may be treated as canonical unless it is added deliberately to this registry and the runtime schema.

---

## Added Anchors (Onboarding Flow + Brand System)

### `onboardingSessions`
- Primary key: `id` (uuid)
- Parent key: `siteConfigId`
- Role: tracks 5-step AI Biz Bot business onboarding progress, collected data per step, and completion status
- Table: `onboarding_sessions`

### `qrRouteViews`
- Conceptual anchor (column on `qr_routes.view_id`)
- Role: links a QR scan event to a specific canvas `viewId`, enabling deep-link routing into the ConciergePanel menu system
- No separate table — modeled as a property of the `qrRoutes` anchor

### `agentPreflightLogs`
- Planned anchor — will track per-agent preflight check results before each deployment
- Currently implicit in the go-live gate response (`POST /api/site-configs/:id/go-live`)
- Add dedicated table when preflight history is required for compliance or audit

### `brandIdentityProfiles`
- Conceptual anchor — brand identity data collected in Step 3 of the onboarding flow
- Currently stored as JSONB in `onboarding_sessions.collected_data`
- Promote to a dedicated table (`brand_identity_profiles`) when brand versioning or multi-theme support is required
