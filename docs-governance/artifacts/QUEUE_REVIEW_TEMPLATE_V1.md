---
status: template
truth_domain: governance
enforced_by: none
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-29
spec_id: queue_review_template
spec_version: "1.0.0"
---

# Queue review template (v1)

## Purpose

Make **queue reviews** (CTO / program audits, backlog truth checks) **hard to misread** by separating:

- **repo truth** (what exists on disk and in running code)
- **ambition** (docs, YAML, types, plans, validators)
- **operator reality** (what a human can invoke today through an approved surface)

**Canonical docs, registry YAML, passing validators, and typed contracts are not runtime completion.** Each work item must declare **`operator_usable_today`** so progress is not overstated when governance outruns executable surfaces.

## Required fields (every work item)

| Field | Required | Description |
|-------|----------|-------------|
| `current_truth` | yes | One factual sentence: what is **actually** in the repo or runtime (no intent). |
| `runtime_status` | yes | What executes: e.g. HTTP route mounted, background job, service with no entrypoint, tests only, none. |
| `operator_usable_today` | yes | One of the four values below (mandatory). |
| `next_concrete_step` | yes | Smallest next action that increases operational truth (prefer thin surfaces over new prose). |
| `blocking_dependency` | yes | Credential, vendor, human approval, upstream API, or `none`. |

## `operator_usable_today` (mandatory enum)

Use **exactly** one of:

| Value | Meaning |
|-------|---------|
| `yes` | A **real operator** can invoke it today through an **approved** route, UI, or workflow (production or staging as appropriate). |
| `admin-only` | Callable through an **authenticated internal/admin** surface, but **not** part of normal operator flow. |
| `dev/test-only` | Only reachable through **code, tests, scripts, shell**, or **direct in-process** service invocation (no approved operator surface). |
| `no` | **Docs, YAML, types, plans, partial scaffolding only** — not callable as a product or internal workflow. |

### Examples (illustrative)

| Work item | Typical `operator_usable_today` |
|-----------|----------------------------------|
| `POST /api/canvas-control` with `canvas.resolve` | `yes` (if that route is part of shipped operator/customer flow) |
| Service exists but **no** HTTP route (tests / direct import only) | `dev/test-only` |
| Onboarding skill IDs declared only in YAML, not in skill dispatch | `no` |
| Doppler MCP governance plan with no repo artifacts | `no` |
| Guarded admin HTTP API (`requireAuth` + site tenancy) | `admin-only` |

### Composite workstreams — use sub-items

Large features (e.g. **integration onboarding**) often ship **one thin surface at a time**. Do **not** use a single row like “onboarding: done” when only **part** of the workflow is operator-invokable.

**Split into separate queue rows** (same fields each), for example:

| Sub-item | Notes | Typical `operator_usable_today` |
|----------|--------|----------------------------------|
| Onboarding **status** read API | e.g. `GET /api/integration-onboarding/cloudbeds-graphql-discovery/:siteConfigId` | `admin-only` when mounted + guarded |
| Onboarding **validate** API | e.g. `POST .../validate` (+ `skipHttpValidation`) | `admin-only` when mounted + guarded |
| **Secure auth handoff** / connect token **mint** | e.g. integration connect lane | `admin-only` when mounted + guarded; `no` if docs-only |
| **Owner SMS** / `send_integration_onboarding_sms` | Sovereign SMS Router path | `no` until implemented and routed |

That keeps **partial but real** implementations visible and avoids collapsing “status + validate APIs exist” into “full onboarding complete.”

## Review sections (recommended)

When producing a full queue review, keep these sections so **false-confidence** stays visible:

1. Executive summary (repo truth vs ambition)
2. Completed work (evidence-bound)
3. In-flight work
4. Planned / not implemented
5. Governance-only additions
6. Runtime-capable additions
7. Queue table (use the fields above **per row**)
8. False-confidence risks
9. Recommended next steps (thin operator surfaces first)
10. Final status map (shipped / partial / governance / queued / blocked)

## Related

- [`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](../canonical/GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md) — daily work items and artifacts
- [`GOVERNANCE_REVIEW_ENGINE.md`](../canonical/GOVERNANCE_REVIEW_ENGINE.md) — pre-implementation review (complementary to queue truth audits)
