---
status: draft
truth_domain: governance
enforced_by: peer_review_alignment plan Phase 1 gate — Phase 2 repair blocked until this inventory is reviewed or a valid waiver row exists
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
spec_id: integration_governance_inventory
spec_version: "1.0.0"
---

# Integration governance inventory (V1)

## Purpose

This document is the **Phase 1 gate** for the integration / onboarding governance lane: a single place to record **scope keys**, **fallback behavior**, **auth planes**, **connect-token surfaces**, **SMS entrypoints**, and **audit-write rules** before repair PRs proceed.

- **Canonical identity:** [`site_configs.id`](../canonical/SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md) (Gateway UUID) for tenancy and business scope.
- **Execution contract:** Aligns with the peer review alignment plan (single lane: audit → repair → proof pack → resume broader work).

**Visual execution contract (platform-uniform):** Phase 2 **hard gate** — [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](../canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md). Canvas/OS UI must be **Shadcn MCP + design tokens**; **forbidden:** presentation `style={{}}`, ad-hoc hex, artboard layouts without OS patterns. Enforcement: Phase 2 PR review + `npm run governance:visual-integrity` on touched paths.

**Zero-trust identity (classification):** No script, route, or operator workflow may be described as **production-ready**, **proof-capable**, or **operator-complete** if it relies on **hardcoded or silent fallback** external identifiers (`vendor_property_id`, `place_id`, etc.) **outside** the formal `siteConfigId`-based auth and tenancy plane.

---

## Inventory status

| Section | Status | Owner / notes |
| ------- | ------ | ------------- |
| 1. Scope-key surfaces | Draft (slice) | Obscure CLI / other scripts: extend as needed |
| 2. Fallback scripts | Draft | Phase 2: fail-closed banners on proof scripts |
| 3. Auth surfaces | Code-mapped | **Source of truth** for this slice — §3.A–C |
| 4. Connect token | Draft + waiver | **W-001** defers supersession; enumerate routes in Phase 2 |
| 5. Outbound SMS | Enumerated | `dispatchSms` + key bypass paths — §5 |
| 6. Audit / actor | **Decided + enforced** | Option C in [`sendCloudbedsGraphqlDiscoveryOnboardingSms`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts) (`MISSING_ACTOR_CONTEXT`) |
| 7. Visual Integrity (Phase 2 hard gate) | **Law** | [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](../canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md) — No-Inline rule; Shadcn MCP + tokens; audit via `npm run governance:visual-integrity` |
| Waiver log | W-001 | Auto-expiry rule — see §Waiver log |

---

## 1. Scope-key misuse (routes and scripts)

List surfaces where **business scope** might be carried by something other than `siteConfigId` (or session-resolved site). Mark **fix**, **documented exception**, or **migration-only**.

| Surface (file or route) | External or risky key | Intended scope key | Disposition | Notes |
| ------------------------- | ---------------------- | ------------------- | ----------- | ----- |
| [`scripts/lib/boardwalkSiteIdentity.ts`](../../scripts/lib/boardwalkSiteIdentity.ts) | `place_id` (legacy lookup) | `siteConfigId` | Exception path | Gated by env; see SITE_IDENTITY shim rules |
| [`scripts/diagnose-boardwalk-cloudbeds-auth.ts`](../../scripts/diagnose-boardwalk-cloudbeds-auth.ts) | synthetic / first row | `siteConfigId` | Diagnostic-only | Not proof-capable |
| [`GET /api/cloudbeds/availability`](../../server/routes/cloudbedsRoutes.ts) | Query `propertyId` and/or env `CLOUDBEDS_*_PROPERTY_ID` + global API key | **None** (no `siteConfigId` on request) | **Fix / not tenant-proof** | Backward-compat demo path; **not** proof-capable under zero-trust identity |

---

## 2. Fallback misuse (scripts)

Scripts that can use **first row**, **synthetic id**, or **legacy place_id** without explicit operator intent. Label **diagnostic-only** vs **proof-capable** (proof-capable must be fail-closed per plan).

| Script | Fallback behavior | Label | Disposition |
| ------ | ----------------- | ----- | ----------- |
| [`scripts/diagnose-boardwalk-cloudbeds-auth.ts`](../../scripts/diagnose-boardwalk-cloudbeds-auth.ts) | First Cloudbeds row, synthetic `siteConfigId`, global env key | Diagnostic-only | Banner / explicit opt-in deferred to Phase 2 (tracked here) |
| [`scripts/e2e-cloudbeds-graphql-discovery-onboarding-proof.ts`](../../scripts/e2e-cloudbeds-graphql-discovery-onboarding-proof.ts) | Legacy `place_id` when UUID unset | Proof script | **`--confirm-governance`** or `E2E_CONFIRM_GOVERNANCE=1` required to run |

---

## 3. Auth surfaces (canonical matrix — draft from code)

**Goal:** One row per route with: **auth plane**, **principal**, **credential**, **tenant binding**, **forbidden misuse**.

**Sources:** [`integrationOnboardingRoutes.ts`](../../server/routes/integrationOnboardingRoutes.ts) (`requireAuth` = platform admin [`auth_sessions`](../../server/auth.ts) via `Authorization: Bearer`), [`cloudbedsRoutes.ts`](../../server/routes/cloudbedsRoutes.ts). Mount: `app.use("/api/integration-onboarding", …)`, `app.use("/api/cloudbeds", …)` in [`routes.ts`](../../server/routes.ts).

### 3.A Platform admin — integration onboarding (GraphQL discovery lane)

All routes use **`requireAuth`** + **`assertSiteAccessForSession`**; `:siteConfigId` must match session-allowed sites.

| Method | Path | Auth plane | Principal | Credential | Tenant binding |
| ------ | ---- | ---------- | --------- | ---------- | -------------- |
| GET | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId` | Platform admin | `admin_users` via session | `Authorization: Bearer` → `auth_sessions` | Param `siteConfigId` + `guardSite` |
| POST | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/validate` | Same | Same | Same | Same; optional `skipHttpValidation` query |
| POST | `/api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId/send-sms` | Same | Same | Same | Same; body `actorAdminUserId` from `session.adminUserId` |

| Forbidden misuse |
| ---------------- |
| Using **customer** Bearer or **vendor** `x-api-key` / `CLOUDBEDS_CLIENT_API_KEY` as if it were this admin API. |
| Calling send-sms **without** admin session token (401). |

### 3.B Cloudbeds routes — mixed planes

| Method | Path | Auth plane | Principal | Credential / cookie | Tenant binding |
| ------ | ---- | ---------- | --------- | ------------------- | -------------- |
| GET | `/api/cloudbeds/availability` | **None** (open) | N/A | Env `CLOUDBEDS_*_API_KEY` + query/env `propertyId` | **Not** `siteConfigId`-scoped |
| GET | `/api/cloudbeds/oauth/start` | **Dual:** integration-connect session **or** customer session | Operator (connect) **or** site owner (customer) | `INTEGRATION_CONNECT_SESSION` cookie **or** `Authorization: Bearer` customer token | Query `siteConfigId`; connect cookie must match site+vendor |
| GET | `/api/cloudbeds/oauth/callback` | Public callback | OAuth state → `siteConfigId` | HMAC `state` (no Bearer) | `verifyOAuthState` → `siteConfigId` |
| GET | `/api/cloudbeds/reservations` | Customer | Owner of site | `requireCustomerAuth` | `siteConfigId` query + `assertCustomerOwnsSite` |
| GET | `/api/cloudbeds/reservation` | Customer | Owner of site | Same | Same |
| POST | `/api/cloudbeds/reservations` | Customer | Owner of site | Same | Body `siteConfigId` + `assertCustomerOwnsSite` |

| Forbidden misuse |
| ---------------- |
| Treating **`/availability`** (unauthenticated env key + property id) as equivalent to broker-backed, **`siteConfigId`**-scoped calls. |
| Starting OAuth without valid **connect session** or **customer owner** session for that `siteConfigId`. |

### 3.C Vendor HTTP (all above)

Actual Cloudbeds HTTP uses **`cloudbedsHeadersForCapability`** / broker after resolving [`site_pms_integrations`](../../shared/schema.ts) by **`siteConfigId`** — never raw client-supplied vendor secrets on these paths except the legacy **`/availability`** path.

*Merge this subsection into [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](../canonical/INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md) in Phase 2 as the canonical matrix.*

---

## 4. Connect token (mint, validate, mark used, exchange)

| Operation | Entry point | File / service | Notes |
| --------- | ----------- | -------------- | ----- |
| Mint | [`mintIntegrationConnectToken`](../../server/services/integrationConnectTokens.ts) | `integrationConnectTokens.ts` | Hash-only storage |
| Validate | [`validateIntegrationConnectToken`](../../server/services/integrationConnectTokens.ts) | Same | Structured outcomes |
| Mark used | [`markIntegrationConnectTokenUsed`](../../server/services/integrationConnectTokens.ts) | Same | Single-use |
| Handoff URL | [`beginCloudbedsIntegrationAuthHandoff`](../../server/services/beginCloudbedsIntegrationAuthHandoff.ts) | Cloudbeds onboarding | Mint + connect URL |
| Browser exchange | [`integrationConnectRoutes.ts`](../../server/routes/integrationConnectRoutes.ts) | Routes | Session bind |

**Supersession / cooldown:** Deferred per **Waiver W-001** (accepted risk until Phase 2 policy or expiry). Default mint TTL remains **1 hour** in [`integrationConnectTokens.ts`](../../server/services/integrationConnectTokens.ts).

---

## 5. Outbound SMS (operator / customer)

All **compliant** product SMS should use [`dispatchSms`](../../server/services/smsRouter.ts) (Sovereign SMS Router). Direct [`sendSms`](../../server/twilio.ts) bypasses intent classification — see grep inventory below.

### 5.A Integration / onboarding slice (this gate)

| Entry | HTTP / path | Intent | `siteConfigId` |
| ----- | ------------ | ------ | -------------- |
| [`sendCloudbedsGraphqlDiscoveryOnboardingSms`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts) | via `POST …/integration-onboarding/.../send-sms` | `PLATFORM_CARE` | Required on input |

### 5.B Other `dispatchSms` call sites (platform)

| File / route | Intent | Notes |
| ------------ | ------ | ----- |
| [`shareRoutes.ts`](../../server/routes/shareRoutes.ts) `POST /api/share/send-sms` | `PLATFORM_MKTG` | Public; body includes `siteConfigId` |
| [`shareRoutes.ts`](../../server/routes/shareRoutes.ts) `POST /api/share/send-payment-link` | `CUSTOMER_CARE` | `requireAuth` + `assertSiteScopedAccess` |

### 5.C Direct `sendSms` (bypass router — not new integration sends)

| File | Notes |
| ---- | ----- |
| [`routes.ts`](../../server/routes.ts) | Legacy path — review if still reachable |
| [`telephonyRoutes.ts`](../../server/routes/telephonyRoutes.ts), [`claimRoutes.ts`](../../server/routes/claimRoutes.ts) | Domain-specific |
| [`energyAlerts.ts`](../../server/services/energyAlerts.ts), [`pulseCheck.ts`](../../server/services/pulseCheck.ts) | Internal / ops |
| [`vineDispatchHandler.ts`](../../server/tools/vineDispatchHandler.ts) | Tool dispatch |

*New onboarding or operator SMS must not add paths here without router compliance review.*

---

## 6. Audit-write conditions (integration onboarding SMS)

**Table:** [`integration_onboarding_sms_audit`](../../migrations/0075_integration_onboarding_sms_audit.sql) (append-only).

**Write path:** [`insertIntegrationOnboardingSmsAudit`](../../server/services/integrationOnboardingSmsAudit.ts) from [`sendCloudbedsGraphqlDiscoveryOnboardingSms.ts`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts).

### `actorAdminUserId` policy (**recorded**)

[`persistAudit`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts) only inserts when `actorAdminUserId` is set. [`actor_admin_user_id`](../../migrations/0075_integration_onboarding_sms_audit.sql) is **`NOT NULL`** — **Option B** (null actor rows) would require a **schema migration** and is **out of scope** unless explicitly approved later.

| Option | Behavior |
| ------ | -------- |
| **A** | Attempts without actor are **forbidden** (route returns 4xx). |
| **B** | Log with **null actor** + structured reason (schema change if needed). |
| **C** | **Fail-closed** for operator-visible sends without actor. |

**Recorded decision: Option C (fail-closed)** — **2026-03-30**

**Reason:** (1) `actor_admin_user_id NOT NULL` eliminates Option B without migration. (2) Operator accountability requires a known admin principal before a real SMS dispatch; platform admin session must be healthy (`session.adminUserId`). (3) Aligns with zero-trust posture for operator-initiated actions.

**Approver:** Governance / peer review consensus *(named executive sign-off may be appended).*

**Runtime enforcement (Phase 2):** Non–dry-run without `actorAdminUserId` → **`MISSING_ACTOR_CONTEXT`** (HTTP **400**). **Dry-run** without actor: **allowed** for Phase 3 proof paths; **no audit row** (NOT NULL actor); service emits **`console.warn`** — this is **intentional** but was **not** “pre-approved runtime behavior” in the inventory until documented here; do not assume the warning existed before the enforcement PR.

**Implication for Phase 3 proof pack:** Evidence item (b) requires proof that actor was captured or send was **rejected** per this policy.

---

## Waiver standard (anti–waiver creep)

A waiver is **valid** only if **all** rows below are filled. Verbal OK is **not** a waiver.

| Field | Requirement |
| ----- | ----------- |
| (a) | Exact risk accepted |
| (b) | Mitigation applied |
| (c) | Named approver |
| (d) | Expiry date **or** review trigger |

## Waiver log

| ID | Date (UTC) | Risk accepted (a) | Mitigation (b) | Approver (c) | Expiry / review trigger (d) | Linked gate / PR |
| -- | ---------- | ------------------ | -------------- | ------------- | ----------------------------- | ---------------- |
| **W-001** | 2026-03-30 | Multiple valid **connect tokens** may exist for the same `(siteConfigId, vendor, lane)` until expiry because **supersession / cooldown** is not implemented yet. | Default mint **TTL 1h** in [`integrationConnectTokens.ts`](../../server/services/integrationConnectTokens.ts); Phase 3 proof manually verifies token behavior; **Phase 2** implements supersession/cooldown or renews waiver. | Governance / peer review consensus | Revisit **before** Phase 2 merge that changes connect-token send volume, or by **2026-06-30** review date (whichever first). | §4; Phase 2 `connect-token-supersession` |

**W-001 auto-expiry (fail-closed waiver):** The waiver **expires automatically** on the **earlier** of: (1) the date **2026-06-30** UTC, or (2) merge/deploy of Phase 2 work that **materially increases** connect-token issuance/SMS volume **without** a renewed waiver row. After expiry, relying on this waiver **without** a **new** row (same fields a–d) is a **governance violation**; supersession/cooldown must be implemented or a renewed waiver recorded **in writing** in this table.

---

## 7. Visual Integrity gate (Phase 2 — law)

**Canonical:** [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](../canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md) · companion: [`CANVAS_OS_TOOL_MANDATE_V1.md`](../canonical/CANVAS_OS_TOOL_MANDATE_V1.md)

| Pillar | Rule |
|--------|------|
| Component generation | **Shadcn MCP** path for new canvas primitives; no unstructured “hallucinated” layout stacks. |
| Styling | **Token-only** — `brand.ts`, `ui-core`, `index.css` semantic variables (`--background`, `--foreground`, `--primary`, …); prefer `CANVAS_BG_CLASSNAME` vs inline canvas bg. |
| Layout | **OS patterns** — inherit shell/view contracts; no speculative artboard UI. |

**Audit:** `npm run governance:visual-integrity` — reports inline `style={{` count in scoped `client/` trees (baseline for cleanup; forward PRs must not increase violations without waiver).

**CI enforcement:** `.github/workflows/sovereign-guard.yml` runs `scripts/sovereign-gate-governance.ts` (inventory **TBD** when `server/routes/` or `scripts/` change, **strict visual v2** — grandfather caps per file in `visual-integrity-inline-style-baseline.json`, no new inline styles outside allowlist, Option C SMS guard, anti-artboard patterns on changed client TSX). Local: `npm run governance:visual-integrity:strict`.

**Phase 2 PR rejection:** Any change that introduces non-tokenized canvas presentation or artboard-style layouts without a recorded waiver in `CANVAS_OS_TOOL_MANDATE_V1.md` § Waivers.

---

## Phase 3 governance proof pack (checklist)

Phase 3 is not complete until evidence exists (queue item or attached artifact). Minimum:

| ID | Evidence |
| -- | -------- |
| (a) | Trace ID and/or **direct pointer** to audit row(s) for dry-run and live-send validation |
| (b) | **Actor:** `actorAdminUserId` captured or rejected per policy in section 6 |
| (c) | **UI:** Admin response JSON redaction (e.g. [`IntegrationOnboardingSmsCard`](../../client/src/components/admin/IntegrationOnboardingSmsCard.tsx)) — snippet acceptable |
| (d) | **Recipient:** Final resolution source (override vs assigned vs owner phone) |
| (e) | **Provider:** Live-send acceptance or denial reason (or documented skip if policy forbids live send) |

Use [`QUEUE_REVIEW_TEMPLATE_V1.md`](./QUEUE_REVIEW_TEMPLATE_V1.md) fields when updating queue classification.

---

## Related documents

- [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](../canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md)
- [`CANVAS_OS_TOOL_MANDATE_V1.md`](../canonical/CANVAS_OS_TOOL_MANDATE_V1.md)
- [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](../canonical/SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md)
- [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](../canonical/INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md)
- [`INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md`](../canonical/INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md)
- Peer review alignment plan: [`.cursor/plans/peer_review_alignment_0e2c46c4.plan.md`](../../.cursor/plans/peer_review_alignment_0e2c46c4.plan.md)
