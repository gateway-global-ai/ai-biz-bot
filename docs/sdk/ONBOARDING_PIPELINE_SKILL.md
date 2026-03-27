# Onboarding Pipeline Skill (Sovereign AI OS)

**Purpose:** Specify how agents **research the codebase** to map **business onboarding** — Places / grounding, Serp enrichment, `siteConfigId`, routing (`/biz`, `/agent`), QR, direct chat — and to separate **live** behavior from **deprecated** or **archive-only** references.

**Scope:** Read-only mapping and documentation outputs unless a separate task authorizes code changes. Client + **modular** server routes only (`server/routes/`). Does not replace compliance onboarding ([`OnboardingGateway.tsx`](../../client/src/pages/account/OnboardingGateway.tsx)) — that is a **parallel** activation track.

**Cursor skill:** [`.cursor/skills/sovereign-onboarding-pipeline/SKILL.md`](../../.cursor/skills/sovereign-onboarding-pipeline/SKILL.md)

**Product truth anchors (read after research):**

- **What is (as-built):** [`docs/product/ONBOARDING_PIPELINE_MAP_V1.md`](../product/ONBOARDING_PIPELINE_MAP_V1.md)
- **What must be (system target):** [`docs/product/ONBOARDING_PIPELINE_TARGET_V1.md`](../product/ONBOARDING_PIPELINE_TARGET_V1.md)
- **Customer readiness (LOCKED v1):** [`docs/product/CUSTOMER_READY_V1.md`](../product/CUSTOMER_READY_V1.md)
- **Go-live transitions (LOCKED v1):** [`docs/product/ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](../product/ONBOARDING_GO_LIVE_TRANSITIONS_V1.md)

---

## Spawn prompt (short)

Research the Sovereign onboarding **spine**: where **business identity** is created, where **`siteConfigId`** is assigned, and where **first customer interaction** is possible. Classify each step as **production**, **deprecated-but-referenced**, or **archive context** (`_legacy_archive/` read-only). Output a pipeline map YAML or markdown table with APIs, files, and schema anchors. Do not assume all documented routes are mounted.

---

## Classification (mandatory)

| Class | Meaning |
|-------|---------|
| **production** | Mounted route + handler in use on happy path today |
| **deprecated_ref** | Still imported, linked, or mentioned; behavior uncertain or legacy |
| **archive_context** | Under `_legacy_archive/` or historical docs — summarize only, no runtime truth |

Validate **production** claims against client routing and server mount points.

---

## Onboarding spine (must document)

1. **Business identity creation** — first persisted record (name, `placeData`, `placeId`, etc.).
2. **`siteConfigId` assignment** — typically `POST /api/site-configs` response `id`; note any claim/link steps.
3. **First customer interaction** — earliest public or authenticated surface (e.g. `/biz/:slug`, agent page, QR `?from=qr`, widget).

---

## Non-exhaustive research checklist

**Client**

- [`client/src/pages/customer/BusinessPage.tsx`](../../client/src/pages/customer/BusinessPage.tsx) — stages, manual vs Places flows.
- [`client/src/components/account/ProfileContent.tsx`](../../client/src/components/account/ProfileContent.tsx) — Places autocomplete + `POST /api/site-configs` + claim.
- [`client/src/pages/reseller/ResellerDashboard.tsx`](../../client/src/pages/reseller/ResellerDashboard.tsx) — `/api/places/search`, grounding-style search.
- [`client/src/pages/account/OnboardingGateway.tsx`](../../client/src/pages/account/OnboardingGateway.tsx) — MSA / A2P / grace (activation compliance, not Places pipeline).
- [`client/src/pages/agents/AgentPage.tsx`](../../client/src/pages/agents/AgentPage.tsx) — slug resolution, QR hints.
- QR / routing components: e.g. [`QRRoutesManager`](../../client/src/components/account/QRRoutesManager.tsx), admin [`PlatformBusinessManager`](../../client/src/pages/admin/PlatformBusinessManager.tsx) routing tab.

**Server (modular)**

- [`server/routes/siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts)
- [`server/routes/qrManagementRoutes.ts`](../../server/routes/qrManagementRoutes.ts)
- [`server/routes/intelligenceRoutes.ts`](../../server/routes/intelligenceRoutes.ts) — provision / orchestration hooks
- Place / search proxies (e.g. `place-search`, `places/search`) — locate via grep from client `fetch` paths.

**Archive**

- `_legacy_archive/` — reference only; compare concepts to [`docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md`](../../docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md) if concepts recur.

---

## Output schema (pipeline map)

For each **step** (ordered):

- `step_id` — short id
- `description`
- `classification` — `production` | `deprecated_ref` | `archive_context`
- `client_files[]`
- `api_methods[]` — method + path
- `server_files[]` or route module
- `schema_anchors[]` — e.g. `siteConfigs`, `agents`
- `notes` — gaps, env keys, feature flags

Close with **spine_summary**:

- `identity_creation_step_id`
- `site_config_id_step_id`
- `first_customer_touch_step_id`

---

## Blocked / deferred

- Implementing a new wizard in the same pass as the first map.
- Voice pipeline or Twilio webhook edits without dedicated governance tasks.

---

## v1 vs later

| v1 | Later |
|----|--------|
| Map + classify + spine | Target “correct” architecture doc |
| Read-only | Implemented onboarding v2 |
