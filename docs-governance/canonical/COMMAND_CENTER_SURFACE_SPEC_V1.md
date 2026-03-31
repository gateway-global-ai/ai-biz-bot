---
status: canonical
truth_domain: ui
enforced_by: view-and-action-registry.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-29
---

# Command Center Surface — Spec v1

## Purpose

`command_center` is the **first governed composable canvas surface**: a fixed **zoned layout** filled only from **`CommandCenterViewModel`** and palette primitives. It proves **runtime-composed UI** without an open-ended generative sandbox.

**Parent contract:** [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md)  
**View registry:** [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) § `command_center`  
**Types:** [`shared/canvasViewContract.ts`](../../shared/canvasViewContract.ts) — `CommandCenterViewModel`, `CanvasRenderPayload` branch `viewId: 'command_center'`

## Slot semantics authority

`command_center` is a **composition shell** only. It MUST **not** invent product semantics. **What appears in each slot** MUST ultimately derive from the governed merge in [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) § **Intent-to-surface derivation**:

| Slot | Primary semantic inputs (target architecture) |
|------|-----------------------------------------------|
| `status_lane` (`statusItems`) | **Lifecycle stage** + **domain journey state** (e.g. hospitality guest class) + high-signal session flags |
| `main_work` (`workItems`) | **Active swarm role** + **operational mode** + **allowed capabilities** — the role’s next governed tasks, not a generic task dump |
| `approvals_tray` (`approvals`) | **Actions** allowed for that **role × stage × visitor security** ∩ [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) |

The **last utterance** adjusts emphasis or disambiguates **within** that envelope; it does not replace classification or `swarm_role_contract`.

## Non-goals (v1)

- Default home screen for all users (staff/admin gate remains).
- Arbitrary component trees, MCP-emitted JSX, or unregistered `dynamic` payloads inside this view.
- Full hospitality PMS data plane in v1 (demo copy may reference operations language; data binds in a later milestone).
- LangGraph-style orchestration graph as the default chrome (optional drill-down only, future).

## Semantic scope (stay narrow)

The surface should **only** carry:

| Concern | In scope v1 |
|---------|-------------|
| Status / health / lane summaries | Yes (`statusItems`) |
| Work queue / next steps (copy, not unbounded DOM) | Yes (`workItems`) |
| Pending approvals / explicit actions | Yes (`approvals[]` when populated) |
| Context line (plan, environment) | Yes (`contextSummary`) |
| Evidence panels, charts, live graphs | No (future zone or separate view) |
| Generic “dump any JSON” | **Never** |

If a feature does not fit the table, **add a new `CanvasViewId`** or extend this spec in a **v2** PR — do not overload `command_center`.

## Slot structure (layout authority)

The renderer (`CommandCenterCanvas` in `SharedCanvasPanel.tsx`) implements **three logical slots** mapped from the view model:

| Slot id | View model field | UI role |
|---------|-------------------|---------|
| `status_lane` | `statusItems[]` | Compact chips / rows — operational signals |
| `main_work` | `workItems[]` | Primary narrative + task cards |
| `approvals_tray` | `approvals[]` (optional) | Explicit `actionId`-bound buttons |

**Ordering:** Visual order is fixed: header (title + headline + context) → status lane → main work → approvals. Reordering **visual zones** is not supported in v1; **reordering items within a slot** is a **`canvas.patch`** concern (see below).

## Component classes (palette)

v1 components are **not** separate React registry entries yet; they are **roles** implemented inside `CommandCenterCanvas`. They map to server **`replace_component.componentType`** allowlist for future patch-driven swaps:

| Class id | Slot(s) | Interaction | Risk tier |
|----------|---------|-------------|-----------|
| `status_row` | `status_lane` | Display-first | Low |
| `work_card` | `main_work` | Display-first | Low |
| `approval_chip` | `approvals_tray` | **Interactive** — dispatches `actionId` | Approval-sensitive |
| `dynamic_frame` | Reserved | Transitional / env-gated experiments | **Restricted** — same policy as `dynamic` view |

**Rule:** `replace_component` must never introduce a type that is not in this table without updating **this doc**, Zod/validator allowlist, and renderer support.

**Future (v2):** Split allowlist by **session class** (e.g. display-only vs interactive-safe vs admin-only) so replacement is not “name-only” but **slot + entitlement + class**.

## Allowed `canvas.patch` ops by slot (v1)

All patches target **`targetViewId: 'command_center'`** and **`patchContractVersion: '1.0'`** (or omitted default).

| Op | Intended use on command_center | Notes |
|----|--------------------------------|-------|
| `replace_field` | Update scalar fields in hydrated model (if path schema extended) | Prefer explicit paths documented before use |
| `append_items` | Append status or work items | Path must reference `statusItems` or `workItems` array semantics |
| `remove_item` | Remove by key | Key discipline TBD in hydration schema |
| `set_loading` / `set_error` | Zone-level loading or error | Bounded UX states |
| `reorder_slots` | Reorder **items within** a list path | Keys must match stable `id` on items |
| `replace_component` | Swap visual role in a logical slot | **Only** allowlisted `componentType` |
| `patch_props` | Constrained prop patch on a bound path | No arbitrary deep object merge without review |

**Invalid (examples):**

- `replace_component` with `componentType` not in the palette table.
- Patch targeting another `targetViewId` without entitlement.
- Declaring success in narration before server validation and client apply.

## Allowed `canvas.action` (v1)

- Actions in **`approvals[]`** must use **`actionId` values** that resolve through server **`allowedRuntimeActions`** / [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) after governance adds them.
- v1 demo may ship with **empty** `approvals[]`; buttons appear only when populated.
- **`actionContractVersion: '1.0'`** (or default) required when specified.

## Visibility & entitlements

| Audience | `command_center` |
|----------|------------------|
| Public / anonymous | **Deny** render (validator: staff or admin required) |
| Staff | Allow (Tier-1 + hydration + patch/action per policy) |
| Admin | Allow |

**Tier-1:** [`canvasIntentRouter.ts`](../../server/services/canvasIntentRouter.ts) — `minSecurityLevel: 'staff'`.

## Narration contract (first-class)

The assistant **must**:

1. **Describe only committed state** — after `canvas.render` (client apply) and `SpeechGroundingContext` reflects `currentViewId` + `screenSummary`.
2. **Not imply** that a patch or action **succeeded** until the syscall returned success and UI updated (or explicitly report failure from policy).
3. **Not claim** controls are usable when the user lacks entitlement (e.g. approvals for anonymous users).
4. Treat **layout changes** as **presentational** unless an action registry entry defines a semantic mutation.

**Grounding:** Align with [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) § Narration rules and voice `canvas_grounding` (voice files are lockdown — prompt changes go through voice governance).

## Demo loop (first operational proof)

Target narrow workflow to validate governed composition end-to-end:

1. Staff user asks for operational / command overview (Tier-1 phrase).
2. `canvas.resolve` → `command_center`; `canvas.render` with hydrated `CommandCenterViewModel`.
3. Renderer shows **palette-only** zones.
4. Optional: one **`canvas.patch`** (e.g. `reorder_slots` or `patch_props` on a documented path) visible in UI.
5. Optional: one **`canvas.action`** from `approvals[]` with registered `actionId`.
6. Narration matches **post-commit** screen state.
7. **Audit** rows in `canvas_events` (or equivalent) show syscall id, pass/fail.

## Operator mutation trace (internal / demo)

**Goal:** Make governance **visible** for demos and internal QA.

**Contract (client-visible minimum):**

| Field | Meaning |
|-------|---------|
| Timestamp | When the syscall completed (client clock) |
| Syscall | `canvas.resolve` / `canvas.render` (audit) |
| HTTP status | Transport outcome |
| `syscallId` | Correlation id when returned by API |
| Error code / message | When validation fails (`403` body) |
| Latency | `latencyMs` when present |
| Result summary | e.g. `selectedViewId`, `noop` |
| Intent loop summary | Phase A+: `resolutionSummary` from `canvas.resolve` (tier, view, plan, workspace, security, **`lc=`** lifecycle stage when observed — PII-free); strip shows `loop=…` |

**Implementation:** Optional strip in Concierge (dev build or `?canvasTrace=1`) fed by [`voiceTurnOrchestrator.ts`](../../client/src/services/voiceTurnOrchestrator.ts); full authoritative trace remains **server audit**. Structured server logs: [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md) Phase A (`[intent_loop.phase_a]`).

**Product:** Not a default customer feature; enable only for operator/demo builds.

## Related

- [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) § Intent-to-surface derivation — **bridge** from swarm classification to UI composition
- [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) — actor class, lifecycle / control stages
- [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) — merge order (classification → domain → tenant)
- [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md) — guest journey classes, roster, tools
- [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md) — `swarm_role_contract`
- [`registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml`](../../registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml) — role × actor × stage
- [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) — autonomy / approval policy
- [`DEMO0_GOVERNED_CANVAS_PROOF.md`](./DEMO0_GOVERNED_CANVAS_PROOF.md) — syscall proof narrative
- [`server/services/canvasDirectiveValidator.ts`](../../server/services/canvasDirectiveValidator.ts) — enforcement
