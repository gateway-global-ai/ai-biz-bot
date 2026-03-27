# Onboarding pipeline target — v1 (system contract draft)

**Purpose:** Define **what “correct onboarding” must mean** for Gateway Global AI OS: canonical entry, named states, compliance placement, and required vs optional work — **without** changing code or UI in this document.

**Principle:** *The map shows what is. The target defines what must be.*  
**As-built reference:** [`ONBOARDING_PIPELINE_MAP_V1.md`](./ONBOARDING_PIPELINE_MAP_V1.md).

**Status:** Draft v1 — **product, legal, and ops** must sign off items marked **OPEN**.

**Scope:** System contract and vocabulary only. Implementation tasks are out of scope here.

---

## 0. Architectural stance: creation-first (current)

**Current reality:** The platform is **creation-first**: a `site_configs` row exists immediately after successful `POST /api/site-configs`, then provisioning and preload run **asynchronously**.

**Target v1:** **Retain creation-first** unless a future version explicitly adopts **readiness-first** (no public identity until a gate passes). This doc assumes creation-first.

**Implication:** **“Site exists” ≠ “site is ready for every promise we make in marketing.”** The definitions below must separate those ideas.

---

## 1. Canonical entry (marketing + attribution)

**Target:** Name **one** primary acquisition path for reporting and narrative; others remain **valid segment entry points**.

| Role | Path | Target label |
|------|------|----------------|
| **Primary public CTA** | `/business` → [`BusinessPage`](../../client/src/pages/customer/BusinessPage.tsx) | **Canonical public entry** |
| Logged-in customer | My Account / `ProfileContent` add-business | **Account entry** |
| Reseller | `/app/reseller` | **Reseller entry** |
| Platform operator | `/platform/businesses` (Places-assisted create) | **Admin entry** |

**Decision (draft v1):** Treat **`/business`** as the **canonical public entry** for funnels, ads, and “start here” copy. Segment entries are **first-class** but not the default CTA.

**OPEN:** CEO/marketing may repoint canonical entry; if so, update this doc and analytics event names.

---

## 2. What defines `site_created`?

**Target definition:** **`site_created` =** HTTP **`201`** from **`POST /api/site-configs`** and a persisted row in **`site_configs`** with assigned **`id` (`siteConfigId`)** and server-generated **`slug`**.

**Keep or extend?** **Keep** as the minimal truth for “business identity exists.” Do not require provision or preload to succeed for `site_created` to be true.

**OPEN:** Whether to expose a distinct **`site_created_failed`** client state beyond HTTP errors (UX contract).

---

## 3. What defines `customer_ready`?

**LOCKED:** The normative definition is **[`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md)** (`customer_ready_v1`). This section is a **summary** only.

**First principle:** Not a feeling or vague UI flag — it is **the moment a customer can interact and get value without breaking trust**.

**Formula (authoritative copy in keystone doc):**

```text
customer_ready_v1 =
  site_created
  AND public_resolution_available
  AND concierge_or_agent_response_available
  AND minimum_identity_present
```

**Non-negotiables:**

- **Response over provision:** Swarm completion is **not** required; a **governed response path** (provisioned agents **or** **fallback concierge**) **is** required.
- **Degraded mode:** On provision/preload failure, the system **must** still respond and **must not** show “not ready” to the customer on the public value path (see keystone § Degraded mode).

**Lock-in line:** *If a customer shows up, the system must respond — no exceptions.*

**Next:** Map as-built → gaps; then one enforcement slice. Transition rules to multi-axis **`go_live`** are a **follow-on** contract (after product/legal align marketing vs telecom).

---

## 4. What defines `go_live`?

**LOCKED (exposure graduation):** Normative definitions, transition rules, and failure handling are in **[`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md)**.

**Summary:**

| Axis | One-line |
|------|----------|
| `public_url_live` | `customer_ready_v1` + coherent public identity/experience; **low–medium** risk exposure |
| `marketing_go_live` | `public_url_live` + **experience quality** threshold; QR/ads/scale — **medium–high** risk |
| `telecom_compliant_live` | `customer_ready_v1` + **compliance** met; **parallel** to marketing axis — **high** risk regulated channels |

**Principle:** *We don’t expose the system — we graduate it.*

**OPEN:** Operationalize `experience_quality_threshold_met` and legal checklist for telecom (see transitions doc).

---

## 5. Where compliance sits (OnboardingGateway vs site create)

**Systems (must stay conceptually separate):**

| System | Role |
|--------|------|
| **A — Business creation** | `/business`, `POST /api/site-configs`, slug, public pages |
| **B — Compliance / activation** | [`OnboardingGateway`](../../client/src/pages/account/OnboardingGateway.tsx), MSA / A2P / grace |

**Target v1 (draft):** **Parallel by default**, matching current architecture: **business creation and public URL can exist while compliance completes**, provided **regulated actions** are gated server-side and in UX.

**Alternatives (not chosen in v1 draft):**

- **Before public exposure:** Block or hide shareable `/biz` until compliance milestones — stronger risk reduction; may hurt time-to-wow.
- **After first interaction:** Rare; usually poor for audit storytelling.

**OPEN:** Whether **QR distribution** or **paid ads** must wait for **specific** compliance milestones.

---

## 6. First “wow moment”

**Target (draft v1):** The **first wow** is **intentional successful assistance** on the **public** surface: Concierge (chat and/or voice per product) responds coherently using **certified/governed** configuration — not a static hero alone.

**Candidates to rank (OPEN):**

- Voice introduction completes on user action (PTT / tap).
- Chat answers first business question using grounded knowledge.
- “Preview” experience before full provision (only if **`customer_ready`** allows honest preview).

**OPEN:** Product picks **one** primary wow for onboarding UX copy and success metrics.

---

## 7. Required vs optional (blocking vs async)

| Stage | Target: required (blocking for stated promise) | Target: optional / async |
|-------|-----------------------------------------------|---------------------------|
| Persist site + slug | **Required** for any “you have a page” claim | — |
| Swarm provision | **Required** for “full team” *marketing* claims; **not** required for `customer_ready_v1` if fallback concierge satisfies [`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md) | Retries, telemetry |
| Preload / reviews / Serp enrichment | **Optional** for `public_url_live`; **may be required** for specific industry promises | Runs async today |
| Knowledge upload | **Optional** for generic go-live; **required** for vertical promises | — |
| OnboardingGateway | **Required** before **regulated** messaging/voice billing claims | Can be parallel to public URL |
| QR generation | **Optional** until “share QR” is promised | Website vs route QR per [`qr-system.mdc`](../../.cursor/rules/qr-system.mdc) |

**OPEN:** Tier matrix (Starter vs Pro) mapping to required rows.

---

## 8. Glossary (normative for future specs)

| Term | Meaning |
|------|---------|
| `site_created` | Row exists; `201` from `POST /api/site-configs` |
| `customer_ready` / `customer_ready_v1` | **[`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md)** — LOCKED keystone |
| `public_url_live` | [`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md) |
| `marketing_go_live` | Same — amplification axis |
| `telecom_compliant_live` | Same — regulated comms axis |
| System A | Business creation funnel |
| System B | Compliance / activation funnel |

---

## 9. Next steps (not this document)

1. Resolve **OPEN** items with owners (product / legal / ops).
2. Add **`ONBOARDING_PIPELINE_TARGET_V1`** acceptance criteria to a governance or epic ticket.
3. Implement **observability** and optional **persisted flags** for provision/preload — **separate engineering task**.
4. Align marketing and sales collateral with **`customer_ready_v1`** ([`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md)) vs **`public_url_live`**.

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| v1 draft | 2026-03-25 | Contract draft; map = truth anchor for as-built |
| v1.1 | 2026-03-25 | §3 `customer_ready` → locked in [`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md) |
| v1.2 | 2026-03-25 | §4 `go_live` axes → locked transitions in [`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md) |
