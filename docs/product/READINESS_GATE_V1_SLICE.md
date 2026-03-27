# readiness_gate_v1 — implementation slice (soft enforcement)

**Purpose:** Document the first enforcement step for **`customer_ready_v1` → `public_url_live`**: explicit **readiness metadata** on public site resolution without blocking access.

**Contracts:** [`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md), [`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md).

**Principle:** *Before we scale exposure, we guarantee the experience.* — this slice **measures** readiness first (soft mode); **hard blocking** is a later flag (e.g. env `READINESS_STRICT_PUBLIC`).

---

## What shipped

### 1. Server evaluator

- **File:** [`server/services/readinessGateV1.ts`](../../server/services/readinessGateV1.ts)
- **Exports:** `evaluateReadinessGateV1` (public payload only), `evaluateReadinessGateV1WithDiagnostics` (includes `reasons[]`, `agent_count`), `logReadinessGateV1Event` (structured log)
- **Logic (aligned with CUSTOMER_READY_V1):**
  - **`site_created`:** non-empty `id` + `slug`
  - **`minimum_identity_present`:** non-empty `name` AND (place context OR `businessDescription` OR `businessType`)
  - **`concierge_or_agent_response_available`:** `getAgentsBySiteConfigId` non-empty **OR** minimum identity (fallback path for governed Concierge context)
  - **Public resolution:** implied when handler returns 200 (404 unchanged)

### 2. Public resolution hook

- **Route:** `GET /api/site-configs/by-slug/:slug` in [`server/routes/siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts)
- **Behavior:** After loading config, loads agents for site, evaluates gate, responds with **`{ ...config, readiness_gate_v1 }`**
- **Soft mode:** HTTP **200** + body unchanged except added field — **no 403** for degraded.

### 2b. Structured telemetry (observe before strict mode)

- Each successful `by-slug` response triggers **`logReadinessGateV1Event`** (unless `READINESS_GATE_LOG=false`).
- **Log shape** (single JSON line, `evt: "readiness_gate_v1"`): `ts`, `site_config_id`, `slug`, `from_qr?`, `customer_ready`, `mode`, `agent_count`, `reasons?` (failure tags only — **not** returned to the browser).
- **Reason tags:** `site_created_false` | `minimum_identity_false` | `concierge_response_path_false` — use for dominant-failure analysis in log search / metrics pipelines.
- **Disable:** set `READINESS_GATE_LOG=false` in env (see [`.env.example`](../../.env.example)).
- **In-process counters:** each `by-slug` evaluation also updates [`readinessGateV1Metrics`](../../server/services/readinessGateV1Metrics.ts). Platform admins: `GET /api/v1/admin/readiness-gate-v1/metrics` and UI [`/platform/tools/readiness-gate`](../../client/src/pages/admin/ReadinessGateMetricsPage.tsx) (resets on deploy).

### 3. Frontend (minimal)

- **[`PublicBusinessPage.tsx`](../../client/src/pages/public/PublicBusinessPage.tsx):** Strips `readiness_gate_v1` before `setSiteData` so **Concierge** and memos see the same shape as before (**no UX / layout change**).
- **[`AgentPage`](../../client/src/pages/agents/AgentPage.tsx):** Strips `readiness_gate_v1` like public page.
- **Other consumers** of `by-slug` (e.g. [`KioskPage`](../../client/src/pages/public/KioskPage.tsx), [`PhonePage`](../../client/src/pages/public/PhonePage.tsx)) receive the extra field; strip if persisted to state.

### 4. Out of scope (this slice)

- No voice / orchestration / Gemini path changes.
- No marketing or telecom gating.
- No banners or “not ready” customer messaging.
- No DB columns for flags yet.

---

## Gaps likely to surface (monitoring)

| Gap | How to detect |
|-----|----------------|
| Missing **name** or identity fields | `readiness_gate_v1.mode === 'degraded'` + low `customer_ready` |
| **Provision race** (no agents yet, no identity for fallback) | Degraded until agents or identity exist |
| **assignedAgentId** without agents | Evaluator uses agent **count**; empty agents + weak identity ⇒ degraded |
| **preload** timing | Not part of `customer_ready_v1`; no change in evaluator |

---

## Next engineering steps (when approved)

1. **Aggregate** `readiness_gate_v1` logs (metrics dashboard, sampled BigQuery, etc.) — no new table required until query needs justify it.
2. Persist flags on `site_configs` or sidecar if ops need **historical** readiness without log retention.
3. **Strict mode:** optional 403 or alternate page when `customer_ready === false` (only after telemetry shows rare/explainable degraded).
4. Owner dashboard: show **readiness** + **degraded** for ops.

---

## Document history

| Date | Notes |
|------|--------|
| 2026-03-25 | Initial soft slice: evaluator + by-slug + PublicBusinessPage strip |
| 2026-03-25 | Structured `readiness_gate_v1` JSON logs + failure `reasons` (server-only) |
