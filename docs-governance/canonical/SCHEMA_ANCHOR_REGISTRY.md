---
status: canonical
truth_domain: schema
enforced_by: schema-anchor-registry.mdc
backed_by:
  schema: true
  service: false
  route: false
last_verified: 2026-03-28
---
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
- Primary key: `siteConfigId` (Gateway UUID) — **sole authoritative internal business/site identity**; external IDs (`place_id`, vendor property ids, etc.) are reference metadata only — see [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](./SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md)
- Role: business / workspace anchor
- Key relationships:
  - parent: `customerAccounts`
  - child/linked: `agents`, chat activity, business configuration

### `agents`
- Primary key: `agentId`
- Parent key: `siteConfigId`
- Role: runtime persona and behavior anchor
- Behavioral & character state: DISC axes (`dominance`, `influence`, `steadiness`, `conscientiousness`) as **judgment weighting inputs**; `arch_profile`, `structured_controls`, `operational_mode`; `short_term_memory` / `long_term_memory` narrative identity — target structured **`character_profile`** (value order, refusal ethics) per [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md)
- Classification v1 (optional FKs): `agent_template_id` → `agent_templates`, `swarm_schematic_member_id` → `swarm_schematic_members`; `primary_actor_class`, `primary_stage_class`, secondary class JSON arrays; `deployment_status` (`legacy` until populated)

### `agent_templates`
- Primary key: `id` (uuid)
- Role: reusable platform agent blueprint (`template_key`, default actor/stage/mode, default capability set ids); **target home for classification-level default cognition** (character priors, conversational power defaults, refusal ethics, ARCH defaults) per [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md)
- Table: `agent_templates`
- See: [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)

### `swarm_schematics`
- Primary key: `id` (uuid)
- Role: bounded swarm definition per industry/schematic key (min/default/max/hard max agent counts)
- Table: `swarm_schematics`

### `swarm_schematic_members`
- Primary key: `id` (uuid)
- Parent key: `swarm_schematic_id` → `swarm_schematics`
- Role: one row per role in a schematic; FK to `agent_templates`; effective capability set / probe ids for that role; **inherits** template cognition defaults with **domain-level** optional overrides
- Table: `swarm_schematic_members`

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

### `integrationConnectTokens`
- Primary key: `id` (uuid)
- Parent key: `siteConfigId` → `siteConfigs`
- Role: short-lived **operator** SMS deep-link tokens for integration connect (`vendor_id`, `connect_lane`, `token_hash` only — no plaintext); not general login — see [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md)
- Table: `integration_connect_tokens`

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
