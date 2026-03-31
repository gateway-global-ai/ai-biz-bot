---
status: canonical
truth_domain: governance
enforced_by: INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1, sovereign-twilio-lockdown, INTEGRATION_OPERATOR_CONNECT_FLOW_V1
backed_by:
  schema: partial
  registry: registry-yaml/integration-onboarding-contracts/cloudbeds_graphql_discovery.v1.yaml
  types: shared/cloudbedsGraphqlDiscoveryOnboarding.ts
last_verified: 2026-03-29
spec_id: cloudbeds_graphql_discovery_onboarding
spec_version: "1.0.0"
---

# Cloudbeds GraphQL discovery — governed onboarding (V1)

## Purpose

The **onboarding agent** is an **intake and authorization coordinator**, not a secret sink. It ensures the tenant integration row holds everything needed for **discovery-only** GraphQL schema work ([`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md)) without treating Doppler project names or ad-hoc env keys as the programmatic contract.

**MUST NOT**

- Guess missing variables or infer tenant truth from environment naming.
- Collect bearer tokens, API keys, or OAuth codes in SMS or chat transcript as the primary path.
- Rely on “the system has env vars somewhere” for tenant onboarding.

**MUST**

- Use [`site_pms_integrations`](../../shared/schema.ts) as the source of truth for non-secret config and broker-bound credentials ([`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)).
- Route SMS through the **Sovereign SMS Router** (no new send paths; no privileged actions by SMS reply alone).
- Send credentials only through the **secure operator surface** ([`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md)) and existing broker persistence.

## Two cooperating pieces

| Layer | Responsibility |
|-------|----------------|
| **Onboarding agent** | Gap detection, owner contact, consent prompts, reminders, orchestration of secure handoff, triggering validation, writing **non-secret** status into `config`. |
| **Integration authorization service** (existing broker + connect flow) | Secure credential capture, storage, binding to `site_pms_integrations`, smoke tests, audit. |

The agent **coordinates** authorization; it does **not** impersonate the authority that stores secrets.

## Persistence (tenant contract)

Non-secret GraphQL discovery fields **MUST** live under:

`site_pms_integrations.config.cloudbeds_graphql_discovery_v1`

| Field | Type | Notes |
|-------|------|--------|
| `http_url` | string (https) | Machine GraphQL POST endpoint; required when discovery is active. |
| `onboarding` | object | Optional; see below. |

**`onboarding` object (v1):**

| Field | Type | Notes |
|-------|------|--------|
| `status` | enum | See [Onboarding state machine](#onboarding-state-machine). |
| `verified_at` | ISO 8601 \| null | Last successful validation / verification. |
| `verified_by` | `operator` \| `system` \| `owner` \| null | Attribution; no free-text PII. |
| `last_validation` | `{ ok, at, error_code? }` | Result of last `validate_integration_configuration` run. |
| `consent_recorded_at` | ISO 8601 \| null | When owner/operator consent was recorded (audit plane). |
| `next_action` | string \| null | Short machine-readable hint (e.g. `open_secure_link`) — not a long narrative. |

Secrets remain in **existing** `site_pms_integrations` columns and broker rules; do not duplicate under new env keys.

## Onboarding state machine

States are listed in [`shared/cloudbedsGraphqlDiscoveryOnboarding.ts`](../../shared/cloudbedsGraphqlDiscoveryOnboarding.ts) as `CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_STATES`.

| State | Meaning |
|-------|---------|
| `not_started` | Discovery not yet in scope; or row exists but onboarding not initialized. |
| `missing_http_url` | `http_url` absent or invalid shape. |
| `missing_auth` | No usable credential on the row for GraphQL (same token lane as REST unless policy says otherwise). |
| `pending_owner_consent` | Operator contact needed; purpose and discovery-only scope not yet acknowledged. |
| `pending_secure_auth_handoff` | Consent OK; waiting for operator to complete **secure** connect flow (OAuth / API key / token paste on web). |
| `auth_received_unverified` | Credential stored; validation not yet run or not yet passed. |
| `validation_failed` | Last connectivity / introspection / scope check failed; `last_validation` holds detail. |
| `ready_for_discovery_ingest` | URL + auth + validation OK; safe to run schema ingest / mapping workflows. |
| `blocked` | Manual intervention (compliance, vendor lockout, repeated failure); do not auto-loop SMS. |

### Typical transitions (non-exhaustive)

```
not_started → missing_http_url | missing_auth | pending_owner_consent
pending_owner_consent → pending_secure_auth_handoff
pending_secure_auth_handoff → auth_received_unverified
auth_received_unverified → ready_for_discovery_ingest | validation_failed
validation_failed → auth_received_unverified (after fix) | blocked
missing_http_url → pending_secure_auth_handoff (after URL set out of band) | …
```

Exact transitions **MUST** be implemented in code with explicit guards; this document is the **contract**, not the runtime.

## Phased flow (operator narrative)

### Phase 1 — Eligibility / intent

- Confirm tenant wants **Cloudbeds GraphQL discovery** (read-only mapping lane; not execution).
- Classify **new setup** vs **repair** (incomplete row).

### Phase 2 — Contact and consent (SMS allowed)

SMS **MAY** be used for: invitation, START/continue nudges, link to secure handoff, short status (“still waiting on secure link”). Copy **MUST** state discovery-only scope and **MUST NOT** ask for secrets in the thread.

**Example SMS (invitation):**

> We’re setting up Cloudbeds GraphQL discovery for your property (read-only schema mapping for our platform; not a second booking system). Reply START to continue, or use the secure link we’ll send next. **Do not send API keys in this message thread.**

**Example SMS (reminder):**

> Your Cloudbeds GraphQL discovery setup is still waiting. Open the secure link we sent to finish authorization.

### Phase 3 — Secure authorization handoff

- OAuth, API key, or token entry **MUST** occur on the **operator connect surface** (`operator.integration.connect` per [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md)), not over SMS.

### Phase 4 — System validation

After credentials are stored:

- Reachability of `http_url` (HTTPS, expected JSON GraphQL response shape).
- Safe introspection or minimal discovery probe; **discovery-only** scope sanity.
- Record outcome in `onboarding.last_validation` and advance `status` to `ready_for_discovery_ingest` or `validation_failed`.

### Phase 5 — Persist onboarding state

- Write `onboarding.status`, `verified_at`, `verified_by`, and validation metadata.
- On failure, set `next_action` to a stable hint for the agent and operator UI.

## Runtime (validation)

Single writer for validation-related onboarding fields: `validateCloudbedsGraphqlDiscoveryConfiguration` in [`server/services/validateCloudbedsGraphqlDiscoveryConfiguration.ts`](../../server/services/validateCloudbedsGraphqlDiscoveryConfiguration.ts). Call with `skipHttpValidation: true` for gap detection only; omit to run the safe introspection probe.

Single normalized reader (no broker, no HTTP, no mutations): `getCloudbedsGraphqlDiscoveryOnboardingStatus` in [`server/services/getCloudbedsGraphqlDiscoveryOnboardingStatus.ts`](../../server/services/getCloudbedsGraphqlDiscoveryOnboardingStatus.ts). Use `deriveCloudbedsGraphqlDiscoveryOnboardingSummary` for deterministic derived flags from a lane config object.

Secure operator handoff (mint connect token + canonical `/connect/cloudbeds?token=` URL, no SMS): [`server/services/beginCloudbedsIntegrationAuthHandoff.ts`](../../server/services/beginCloudbedsIntegrationAuthHandoff.ts). Guarded HTTP: `POST /api/integration/connect/mint` with `INTEGRATION_CONNECT_MINT_SECRET` (header `X-Integration-Connect-Mint` or `Authorization: Bearer`).

Onboarding SMS (PLATFORM_CARE, Sovereign SMS Router only — no secrets in copy; HTTPS link only): [`server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts). Authenticated route: `POST /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/send-sms` (body: `variant`, `toE164` optional, `dryRun`, `eligibilityMode`).

### HTTP (authenticated operator)

Mounted from [`server/routes/integrationOnboardingRoutes.ts`](../../server/routes/integrationOnboardingRoutes.ts). Requires **Bearer** admin session (`requireAuth`) and **site tenancy** (`assertSiteAccessForSession` — global/support roles or reseller-scoped match). **No** secrets in response bodies beyond what is already stored on the integration row metadata.

| Method | Path | Maps to skill id |
|--------|------|------------------|
| `GET` | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId` | `get_integration_onboarding_status` |
| `POST` | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/validate` | `validate_integration_configuration` |
| `POST` | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/send-sms` | `send_integration_onboarding_sms` |

- Validate query: `skipHttpValidation=true` — same as calling `validateCloudbedsGraphqlDiscoveryConfiguration` with `skipHttpValidation: true` (gap detection + auth resolution only; no outbound GraphQL POST).

### Operational status (queue review snapshot)

Use this table with [`QUEUE_REVIEW_TEMPLATE_V1.md`](../artifacts/QUEUE_REVIEW_TEMPLATE_V1.md) fields (`current_truth`, `runtime_status`, `operator_usable_today`, …). **Split sub-items** so “some surfaces exist” is never misread as “full onboarding is finished.”

| Sub-surface | Current truth | Operator scope | Remaining proof / gaps |
|-------------|---------------|------------------|-------------------------|
| **Status API** | `GET .../cloudbeds-graphql-discovery/:siteConfigId` mounted; [`getCloudbedsGraphqlDiscoveryOnboardingStatus`](../../server/services/getCloudbedsGraphqlDiscoveryOnboardingStatus.ts) | **`admin-only`** — `requireAuth` + `assertSiteAccessForSession` | Exercise from scripts or internal UI per tenant; confirm tenancy rules match reseller/global operator expectations. |
| **Validate API** | `POST .../validate` mounted; [`validateCloudbedsGraphqlDiscoveryConfiguration`](../../server/services/validateCloudbedsGraphqlDiscoveryConfiguration.ts); optional `skipHttpValidation` | **`admin-only`** (same auth as status) | Run with and without HTTP probe in staging; confirm persisted `onboarding.*` matches expectations after failures. |
| **Handoff / mint** | [`POST /api/integration/connect/mint`](../../server/routes/integrationConnectRoutes.ts) calls [`beginCloudbedsIntegrationAuthHandoff`](../../server/services/beginCloudbedsIntegrationAuthHandoff.ts); **503** if `INTEGRATION_CONNECT_MINT_SECRET` unset | **Not** Bearer admin session — **shared-secret** gate (`X-Integration-Connect-Mint` or `Authorization: Bearer` = secret). Treat as **trusted automation / internal operator** surface when live; **not operator-invokable** until secret is configured. | Classify independently: do not equate with status/validate auth model. Prove mint → connect URL → operator browser path in a real tenant run. |
| **SMS onboarding** | `POST .../send-sms` mounted; [`sendCloudbedsGraphqlDiscoveryOnboardingSms`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts) → Sovereign SMS Router (`PLATFORM_CARE`) | **`admin-only`** — same Bearer + site tenancy as status/validate | **End-to-end proof** still required: delivery in target env, template copy, eligibility gates, and compliance with [`sovereign-twilio-lockdown`](../../.cursor/rules/sovereign-twilio-lockdown.mdc). Not the same as “SMS skill exists in YAML only.” |
| **Overall** | Status, validate, SMS, and mint/handoff each have **implementations**; full **owner-facing** product workflow may still be incomplete | **Composite partial** — not “onboarding finished” | Polished owner/operator UI, documented runbooks, and E2E acceptance per [`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_REVIEW_V1.md`](../artifacts/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_REVIEW_V1.md) (if present). |

**Sequencing (governance):** exercise **status → validate → mint/handoff → SMS** in that order when proving the loop; keep outbound messaging last so unfinished operator flow is not masked by sends.

## Skill contract (registry)

Machine-readable contract: [`registry-yaml/integration-onboarding-contracts/cloudbeds_graphql_discovery.v1.yaml`](../../registry-yaml/integration-onboarding-contracts/cloudbeds_graphql_discovery.v1.yaml).

| Skill id | Role |
|----------|------|
| `send_integration_onboarding_sms` | Engagement only; routes through SMS Router; **forbidden:** secret collection. |
| `get_integration_onboarding_status` | Gap analysis from `site_pms_integrations` + derived missing fields. |
| `begin_secure_integration_auth_handoff` | Issues or references connect token / secure URL — **forbidden:** complete OAuth in SMS. |
| `validate_integration_configuration` | Post-credential checks; updates `last_validation` and status. |

## SMS channel rules (non-negotiable)

Aligned with **Sovereign SMS Router** and Twilio lockdown:

- **Allowed:** initiate contact, consent prompts, reminders, secure link delivery, coarse status.
- **Forbidden:** raw bearer tokens, API keys, OAuth codes, long technical dumps, privileged admin actions by SMS reply alone.

## Related

- **E2E proof pack (script + local log dir):** [`scripts/e2e-cloudbeds-graphql-discovery-onboarding-proof.ts`](../../scripts/e2e-cloudbeds-graphql-discovery-onboarding-proof.ts) — requires `--confirm-governance` or `E2E_CONFIRM_GOVERNANCE=1` (governance gate; not production-proof-capable). Example: `npm run e2e:cloudbeds-graphql-discovery-onboarding-proof -- --confirm-governance`. Logs under [`artifacts/e2e-cloudbeds-graphql-discovery-onboarding/`](../artifacts/e2e-cloudbeds-graphql-discovery-onboarding/README.md) (gitignored `*.log`).
- [`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_REVIEW_V1.md`](../artifacts/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_REVIEW_V1.md) — queue classification, acceptance criteria for “complete,” E2E proof rule  
- [`CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md`](./CLOUDBEDS_GRAPHQL_DISCOVERY_GOVERNANCE_V1.md) — discovery tier, `config` shape  
- [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](./INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md) — broker and tenant credentials  
- [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](./INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md) — secure connect token and operator surface  
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) — D4 / discovery vs execution  
