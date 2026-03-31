---
status: artifact
truth_domain: governance
enforced_by: none (review truth; not CI)
backed_by:
  schema: partial
  registry: registry-yaml/integration-onboarding-contracts/cloudbeds_graphql_discovery.v1.yaml
last_verified: 2026-03-29
spec_id: cloudbeds_graphql_discovery_onboarding_review
spec_version: "1.0.0"
---

# Cloudbeds GraphQL discovery onboarding — queue / review note (v1)

## Final classification (lock this language)

| Dimension | Verdict |
|-----------|---------|
| **Backend readiness** | **Substantial** — execution primitives exist (status reader, validation writer, secure handoff mint, state-gated SMS via Sovereign SMS Router). |
| **Operator workflow readiness** | **Partial** — authenticated routes exist; closed-loop operator experience is not finished. |
| **Onboarding complete** | **No** — do **not** treat “services exist” as “onboarding shipped.” |

**Governance point:** The platform now has **execution primitives** for onboarding, but **not** the **closed-loop operator experience** (discoverable control surface, audit trail, resend policy, and device-level proof). Queue items must not overstate reality.

### Intermediate classification (after audit + thin admin trigger land)

When **structured audit** and a **minimal admin trigger** (single gated surface; variant + optional `toE164`; POST only to existing route) are both shipped, you may describe **operator workflow readiness** as **materially usable** — still **not** “onboarding complete” until **resend/failure handling** (policy) and **device-level E2E proof** are in place.

| Dimension | After audit + UI only |
|-----------|------------------------|
| **Backend readiness** | Substantial (unchanged) |
| **Operator workflow** | **Materially usable** — operator/admin can trigger without raw API as primary path |
| **Onboarding complete** | **Still no** — until resend policy + E2E proof + acceptance criteria pass |

## Queue language (blunt)

| Work item | `current_truth` | `operator_usable_today` | `next_concrete_step` |
|-----------|-----------------|---------------------------|------------------------|
| **Cloudbeds GraphQL discovery onboarding (composite)** | Status, validate, secure handoff, and state-gated SMS dispatch are implemented with guarded route scope and secure HTTPS links (no raw secrets in SMS). | **Partial:** backend/admin-callable via authenticated API; **no** claim of a finished operator workflow or productized UX. | Add UI/admin trigger, structured audit trail, resend policy, then **full** send → open → connect → state-update smoke on a real device. |

## What is already true (repo / runtime)

- **Normalized read:** `getCloudbedsGraphqlDiscoveryOnboardingStatus` — single reader; derived flags deterministic.
- **Validation write:** `validateCloudbedsGraphqlDiscoveryConfiguration` — single writer for validation-related onboarding fields.
- **Secure handoff:** `beginCloudbedsIntegrationAuthHandoff` + guarded `POST /api/integration/connect/mint` — connect token mint, HTTPS `connectUrl`; `plainToken` not returned from HTTP JSON.
- **SMS dispatch:** `sendCloudbedsGraphqlDiscoveryOnboardingSms` — `SmsIntent.PLATFORM_CARE` only; `dispatchSms` only; state gates (`ready_for_discovery_ingest`, `blocked` suppress); HTTPS link only in body.
- **Routes:** `GET`/`POST`/`POST send-sms` under `/api/integration-onboarding/cloudbeds-graphql-discovery/...` with `requireAuth` + site tenancy.
- **Contracts:** Shared types, registry YAML, tests, docs updated for the above.

## What is not yet true

- **Product control surface:** An authorized admin/operator cannot yet be assumed to trigger invitation/reminder **without** raw API usage from the **intended** UI or admin workflow.
- **Observability:** No single structured audit record yet for every send attempt (actor, site, resolved recipient, variant, suppression reason, Twilio outcome, linkage to minted `integration_connect_tokens` row).
- **Resend policy:** No enforced cooldown, daily/lifecycle cap, or formal supersession rules when a new handoff is minted.
- **End-to-end proof:** No required, repeatable **device-level** smoke (SMS received → link opened → exchange/session → connect → status/validate reflects outcome).

## Acceptance criteria for “onboarding complete”

Do **not** mark this workstream complete until **all** of the following are satisfied:

1. **Control surface** — Authorized admin/operator can trigger **invitation** or **reminder** from an approved surface without relying on ad-hoc API calls as the primary path.
2. **Observability** — Every attempted send records: **actor**, **site**, **resolved recipient**, **variant**, **suppression reason** (if skipped), **Twilio outcome**, and **minted handoff / connect-token linkage**.
3. **Resend policy** — Enforced: **cooldown**, **daily or lifecycle cap**, **clear supersession** behavior when a new link is minted (documented and tested).
4. **End-to-end proof** — A documented smoke passes: send initiated → SMS on device → secure link opened → handoff/connect flow completed → **status/validate** reflects the resulting state.
5. **Operator-safe wording and failure modes** — Copy is correct; blocked/ready suppression behaves as specified; missing phone / missing config yields **explicit**, operator-readable errors.

## Operational risks (if overstated in queue)

- **Claiming “done”** when only backend routes exist — undermines trust and compliance narrative.
- **Resend without policy** — carrier fatigue, opt-out risk, duplicate minted tokens without clear authority.
- **Audit gaps** — cannot answer “who sent what to whom and whether Twilio accepted it” under review.
- **E2E skipped** — regressions in connect flow, SMS pipe, or tenancy guards may ship unnoticed.

## Canonical implementation order (hold this sequence)

**Safest:** structured audit → then minimal admin trigger.  
**Fastest acceptable:** **audit + thin admin trigger in one brutally narrow pass** (one existing authenticated admin surface; one button or compact form; POST only to the existing route; clear render of returned status). Avoid **UI alone for long** — first real operator flows need defensible traceability.

1. **Structured audit** — One record per **attempted** send: **actor**, **site**, resolved recipient **source**, **final recipient** (E.164), **variant**, **suppression / eligibility reason** if no send, **handoff / `integration_connect_tokens` linkage** (row id), **Twilio** attempt/result identifiers if dispatched (no plaintext token).
2. **Minimal admin trigger** — As above; no new backend orchestration on the mint route.
3. **Resend / cooldown / supersession policy** — After audit exists (cooldowns are easier against structured history). Defer unless reminders need policy immediately.
4. **Real device E2E smoke** — Send → SMS received → secure link → connect → status/validate; evidence reference.
5. **Re-review** — Update `last_verified`, classification, and queue row when proof + criteria pass.

**Practical ordering note:** Resend policy should follow audit unless there is immediate pressure to support reminders at scale.

## Hard rule

**Do not mark “Cloudbeds GraphQL discovery onboarding” complete until end-to-end proof passes** (real recipient, real SMS, real secure link, real connect completion, and correct persisted onboarding state). Service existence alone is **insufficient**.

## Related

- [`CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md`](../canonical/CLOUDBEDS_GRAPHQL_DISCOVERY_ONBOARDING_V1.md) — canonical onboarding behavior  
- [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](../canonical/INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md) — connect token and operator surface  
- [`QUEUE_REVIEW_TEMPLATE_V1.md`](./QUEUE_REVIEW_TEMPLATE_V1.md) — queue field definitions  
