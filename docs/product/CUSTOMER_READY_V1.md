# `customer_ready` v1 — locked system contract

**Status:** **LOCKED v1** (2026-03-25) — system contract, not implementation.  
**First principle:** `customer_ready` is **not** a feeling, a loose UI state, or a guess. It is **the moment a customer can interact and get value without breaking trust**.

**Related:** [`ONBOARDING_PIPELINE_MAP_V1.md`](./ONBOARDING_PIPELINE_MAP_V1.md) (what is), [`ONBOARDING_PIPELINE_TARGET_V1.md`](./ONBOARDING_PIPELINE_TARGET_V1.md) (full target), onboarding skill in [`docs/sdk/ONBOARDING_PIPELINE_SKILL.md`](../sdk/ONBOARDING_PIPELINE_SKILL.md).

**Lock-in line:** *If a customer shows up, the system must respond — no exceptions.*

---

## What it must guarantee

If a business shares their **link**, **QR**, or receives a **call**, the experience must:

- **Respond** — no dead ends, no empty shells that imply a broken product.
- **Represent the business correctly** — name and minimum context (see §4).
- **Not feel broken** — no reliance on internal knowledge to interpret errors.
- **Not require internal knowledge** — customers never need to know about provision, preload, or compliance queues.

---

## Definition (normative)

```text
customer_ready_v1 =
  site_created
  AND public_resolution_available
  AND concierge_or_agent_response_available
  AND minimum_identity_present
```

---

## 1. `site_created` (required)

- `POST /api/site-configs` **succeeded** (`201`).
- **`siteConfigId`** exists (persisted row).
- **`slug`** generated server-side and associated with the site.

---

## 2. `public_resolution_available` (required)

- **`/biz/:slug`** resolves successfully for the business’s slug.
- **`GET /api/site-configs/by-slug/:slug`** returns **valid** config for the public surface (no 404 / null state that blocks Concierge).

---

## 3. `concierge_or_agent_response_available` (required)

**At least one** of the following must be true:

| Mode | Condition |
|------|-----------|
| **A — Swarm path** | Agent swarm (or equivalent) **provisioned**; **primary / assigned** agent can respond on the public surface. |
| **B — Fallback concierge** | **System-level fallback** concierge answers using **business name**, **basic context**, and **safe defaults** (governed prompts, no unsafe invention). |

**Critical:**

- **Provisioning is NOT required for readiness** in the sense of “every agent row exists.”
- **A coherent response path IS required** — either provisioned agents **or** approved fallback.

**Trust rule:** Readiness means **response**, not **perfect backend completion**.

---

## 4. `minimum_identity_present` (required)

Must include:

- **Business name** (non-empty, customer-visible).

And **at least one** of:

- **Place-backed context** (`placeData` / address / types from Maps or manual equivalent), **or**
- **Manual description** (`businessDescription` or equivalent), **or**
- **Category / type** (`businessType`, industry, or governed category field).

**Not allowed:** A blank or generic system shell with no identifiable business context.

---

## Explicit non-requirements (v1)

The following are **NOT** required for `customer_ready_v1`:

| Not required | Belongs to |
|--------------|------------|
| Reviews / Serp preload complete | Later enrichment |
| Full knowledge ingestion | Later enrichment |
| Compliance / OnboardingGateway complete | `telecom_compliant_live` / regulated axes |
| Telephony active | Regulated / telecom axis |
| Advanced agent training | Product tier / later states |
| Branding perfection | Optional polish |

---

## Degraded mode (required behavior)

When **provisioning** or **preload** fails or is still **pending**:

**The system MUST:**

- Still **respond** to the customer (via fallback concierge or approved path).
- **Not expose** internal failure to the customer as “broken product.”
- Use **fallback concierge** when swarm path is unavailable (per §3.B).
- **Optionally** log / metric internal state for operators.

**The system MUST NOT:**

- Show **“not ready”** to the **customer** on the public value path.
- **Fail silently** in a way that produces **empty** or **non-interactive** UI where interaction is expected.
- **Break** chat/voice initiation without a governed refusal or safe alternative.

---

## Observable signals (internal — future implementation)

Not mandatory to ship immediately; **this is the shape** of future gates and dashboards:

```json
{
  "customer_ready": true,
  "mode": "fallback_concierge",
  "provision_status": "pending",
  "degraded_mode": true
}
```

Suggested fields (evolvable):

| Field | Role |
|-------|------|
| `customer_ready` | Boolean gate |
| `mode` | e.g. `swarm`, `fallback_concierge` |
| `ready_reason` / `not_ready_reason` | Enum for ops and “why” (internal) |
| `degraded_mode` | True when fallback path is active |
| `provision_status` | e.g. `pending`, `succeeded`, `failed` (internal) |

---

## Relationship to other states

```text
site_created → customer_ready_v1 → go_live (multi-axis)
```

- **`site_created`:** Row + slug exist; async work may still run.
- **`customer_ready_v1`:** Customer can get a **coherent, responsive** experience; **does not** require compliance, telephony, or full enrichment.
- **`go_live` axes:** **[`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md)** — `public_url_live`, `marketing_go_live`, `telecom_compliant_live` (graduation model).

**Implications:**

- Site can exist but **not** yet be `customer_ready` → **must not** be marketed as “try your AI now” without meeting this contract.
- `customer_ready` **does not** require compliance completion for **web concierge** value (regulated channels still gated separately).

---

## Final narrative definition

A business is **`customer_ready_v1`** when **any** customer interaction (web `/biz`, agent page, or phone entry where applicable) produces a **coherent, responsive, context-aware** experience — **even if** the system is still enriching in the background.

---

## Next steps (contract → engineering)

1. **Map as-built → gaps** against this contract (which paths violate §3 or §6 today?).
2. **First enforcement slice (soft):** **[`READINESS_GATE_V1_SLICE.md`](./READINESS_GATE_V1_SLICE.md)** — `readiness_gate_v1` on `GET /api/site-configs/by-slug/:slug` (no hard block yet).
3. **Transition rules** — **[`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md)** (LOCKED). Next: strict mode / marketing axis when product approves.

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| v1 LOCKED | 2026-03-25 | Keystone contract; supersedes draft §3 wording in target doc |
