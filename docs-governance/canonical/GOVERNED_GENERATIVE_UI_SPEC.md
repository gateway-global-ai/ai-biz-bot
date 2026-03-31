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

# Governed Generative UI (GGUI) — Canonical Spec

## Objective

The AI OS composes **customer-visible UI at runtime** only through **registered** artifacts: view ids, layouts, a finite component palette, data-binding contracts, action ids, and **UI syscalls** (`canvas.*`). Models and tools **never** emit arbitrary React trees, raw DOM, or unvalidated JSON blobs as the primary composition path.

### Canvas is an OS tool — not a generative artboard

The composition surface (Concierge pinned canvas + syscall-backed views) is **instrumentation**, not a sketchpad. **Normative:** [`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md) — agent-authored canvas UI **must** follow Shadcn MCP discovery/promotion and **design tokens** (no presentation `style={{}}` on canvas paths without a waiver). Reviews **must** record surface type, styling mode, and governance gate (three-part classification); do not collapse into a single “was MCP used?” checkbox.

## Non-goals

- Changing Gemini Live voice protocol, handshake, or sample rates without an explicit **voice governance** task (see sovereign voice lockdown).
- Shipping an “instant app builder” as the default product surface; default remains **intent → syscall → pinned canvas** inside the existing Concierge shell contract.
- Replacing the three-mode chat/PTT layout contract (`sovereign-chat-lockdown.mdc`).

## Terminology

| Term | Definition |
|------|------------|
| **Composition surface** | The governed region where syscall-backed views render (Concierge pinned canvas + related tool surfaces). |
| **Primitive** | A registered `CanvasViewId` with a typed view model and a renderer branch (or legacy adapter). |
| **Layout skeleton** | Zoning hints (e.g. main / status / approvals) — initially documented here and in `VIEW_REGISTRY` `renderHints`; future: `registry-yaml/ui-layouts/*.yaml`. |
| **Data binding key** | A path or field declared in `SiteRuntimeContext` / business hydration used to fill view models (see binding table below). |
| **UI syscall** | `canvas.resolve`, `canvas.render`, `canvas.patch`, `canvas.clear`, `canvas.action` — see `shared/canvasViewContract.ts`. |

## Relationship to existing artifacts

| Artifact | Role |
|----------|------|
| [`shared/canvasViewContract.ts`](../../shared/canvasViewContract.ts) | Syscall types, `CanvasViewId`, discriminated `CanvasRenderPayload`, patch/action contracts. |
| [`server/routes/canvasControlRoutes.ts`](../../server/routes/canvasControlRoutes.ts) | `POST /api/canvas-control` entry; audit hooks. |
| [`server/services/canvasDirectiveValidator.ts`](../../server/services/canvasDirectiveValidator.ts) | Five-layer validation + patch/action allowlists. |
| [`server/services/canvasIntentRouter.ts`](../../server/services/canvasIntentRouter.ts) | Tier-1 deterministic intent → `selectedViewId`. |
| [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) / [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) | Declared views and actions. |
| [`INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`](./INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md) | Authoring policy: canvas is intent/registry-driven. |
| [`EXECUTION_MUTATION_GATE_SPEC_V1.md`](./EXECUTION_MUTATION_GATE_SPEC_V1.md) | Execution-plane vs control-plane mutations. |
| [`DEMO0_GOVERNED_CANVAS_PROOF.md`](./DEMO0_GOVERNED_CANVAS_PROOF.md) | Proof narrative for syscall-backed canvas. |
| [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) | First composed surface: slots, palette classes, patch/action rules, narration, demo loop, operator trace; **slot semantics** defer to § Intent-to-surface derivation below. |
| [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) | Actor class, lifecycle / control **stages**, swarm limits — **who** the interaction is for and **which phase** of work. |
| [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) | Cognition merge order: **classification → domain → tenant**; compiler rules for prompts. |
| [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md) | Hospitality **guest journey** classes (`in_house`, `upcoming_stay`, …) and tool alignment. |
| [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md) | `swarm_role_contract` storage; schematic ↔ integration capabilities. |
| [`registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml`](../../registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml) | Per-role **actor + stage** projection for `hospitality_cloudbeds`. |
| [`client/src/components/chat/ConciergePanel.tsx`](../../client/src/components/chat/ConciergePanel.tsx) | Pinned canvas host. |
| [`client/src/services/voiceTurnOrchestrator.ts`](../../client/src/services/voiceTurnOrchestrator.ts) | Governed resolve → hydrate → render → speech grounding chain. |
| [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md) | Intent-as-loop control plane: state vector, tiered resolver, phased implementation; **`intent_loop.v1`** in [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts). |

## Intent-to-surface derivation (swarm × canvas bridge)

**Plain English (normative):** The next UI state MUST be chosen from the **intersection** of **actor lifecycle stage**, **domain journey state** (where applicable), **active swarm role contract**, **operational mode / allowed capabilities**, and **allowed surface / action registries**. The **last utterance** MAY **refine** presentation or disambiguate within that intersection; it MUST **not** override classification, role authority, or entitlement.

UI is **not** primarily generated from the last phrase, arbitrary LLM reasoning, or a generic assistant mode. It is generated from a **governed merge** of control-plane inputs, then executed through syscalls.

### A. Relationship phase (where the customer fits in the business cycle)

Canonical lifecycle stages for **`customer`**, **`employee`**, and **`vendor`** actors:

`outreach` → `onboarding` → `operations` → `retention`

For **`management`** actors, **control** stages apply:

`planning` | `tracking` | `reporting` | `optimization`

**Source:** [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) § Classification model.

“What's next” is first a **phase-of-relationship** question, not only a conversational one.

### B. Domain moment — hospitality (where the guest fits in the property story)

For hospitality (Cloudbeds lane), **guest journey** classes include:

`in_house` | `upcoming_stay` | `recent_checkout` | `past_guest` | `no_pms_match`

**Source:** [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md) § Guest journey classification (e.g. `pms_lookup_guest_journey`).

Other verticals SHOULD define analogous **domain state** vocabularies in runbooks or registries rather than hardcoding in UI routers.

### C. Swarm role (who is serving)

Archetypes (`concierge`, `booking_coordinator`, `retention_empath`, `lead_qualifier`, `billing_analyst`, `gatekeeper`, …) carry **operational modes**, **capability sets**, and persisted **`swarm_role_contract`** — capability access MUST come from policy and structured controls, not prompt folklore.

**Sources:** [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md) § Agent roster; [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md); [`registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml`](../../registry-yaml/swarm-schematics/hospitality_cloudbeds.v1.yaml).

Per-role **actor + stage** projection (customer vs employee, operations vs retention, …): [`hospitality_cloudbeds_role_classification.v1.yaml`](../../registry-yaml/agent-classification-policy/hospitality_cloudbeds_role_classification.v1.yaml).

### Composition formula (target architecture)

Rendered surface and next actions SHOULD converge toward:

```text
surface = f(
  actor_class,
  lifecycle_stage,           // or control stage for management
  guest_journey_state?,      // domain-specific; hospitality example above
  active_swarm_role,
  operational_mode,
  entitlements,
  allowed_views / actions,    // VIEW_REGISTRY, ACTION_REGISTRY, validator
  current_intent,            // turn-level; disambiguation only within legal set
  slot_rules                   // e.g. command_center — see COMMAND_CENTER_SURFACE_SPEC_V1
)
```

Implementation may be incremental (today: Tier-1 transcript → `canvas.resolve`; tomorrow: explicit merge service reading session + `swarm_role_contract` + journey). The **contract** above is the design authority.

### Illustrative merges (hospitality)

| Actor | Lifecycle | Guest journey | Active role | Emphasis (examples) |
|-------|-----------|---------------|-------------|---------------------|
| customer | onboarding | `no_pms_match` | booking_coordinator | Identity / stay inquiry, room & rate discovery, reservation start, trust-building actions — not in-house ops or retention offers. |
| customer | operations | `in_house` | concierge | Stay details, services, issues, housekeeping asks, property navigation, escalation — not generic onboarding wizard. |
| customer | retention | `recent_checkout` | retention_empath | Thank-you / follow-up, review or rebook, loyalty, closure — not front-desk check-in flows. |

These rows are **product guidance** for hydration and registry mapping; enforcement remains **validator + entitlements + declared actions**.

### Merge order (render logic)

Aligns with [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) (classification-first):

1. **Classification layer** — `actor_class`, `lifecycle_stage` (or management control stage).
2. **Domain layer** — guest journey / PMS match / reservation context (vertical-specific).
3. **Role layer** — `swarm_role_contract`, `operational_mode`, allowed capability / tool sets.
4. **Tenant layer** — site branding, plan entitlements, `allowedCanvasViews` / `allowedRuntimeActions`, property data.
5. **Turn layer** — current user intent, transcript, short-lived conversational context (**refine only**).

### Outputs (what this layer must drive)

Downstream composition SHOULD eventually emit:

| Output | Meaning |
|--------|---------|
| Default / candidate `CanvasViewId` | Within allowed views for session |
| `command_center` slot population | `status_lane` ← lifecycle + journey signals; `main_work` ← role’s next governed tasks; `approvals_tray` ← actions allowed for role + stage + session |
| Allowed next `actionId`s | `ACTION_REGISTRY` ∩ runtime allowlist |
| Escalation / handoff rules | Policy + safe mode |
| Narration priority | Describe committed UI; phase-appropriate copy from merge result |

**Surface contract:** [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) § Slot semantics authority.

## Registries (conceptual contract)

Six layers; each maps to a current or planned repo artifact:

1. **View** — `CanvasViewId` + `VIEW_REGISTRY.md` rows + Zod arms in `canvasPayloadSchemas.ts`.
2. **Layout** — Documented enums / `renderHints` in `VIEW_REGISTRY.md`; future YAML under `registry-yaml/ui-layouts/`.
3. **Component palette** — Finite renderer branches (`TypedCanvasView`, `ToolRouter` tool types). **Restricted:** `dynamic` / Shadcn MCP outputs must not bypass syscall validation. See **Component palette v0** below.
4. **Data binding** — Hydration in `voiceTurnOrchestrator.hydrateViewPayload`, `siteRuntimeResolver`, and server-side context builders. Evolve to a YAML catalog if cross-service reuse grows.
5. **Action** — `ACTION_REGISTRY.md` + `canvas.action` payloads; runtime allowlist via `allowedRuntimeActions` / visitor security.
6. **UI mutation** — Allowed ops only: `canvas.render`, `canvas.patch` (versioned, allowlisted ops), `canvas.clear`, `canvas.action` (versioned contract). No ad hoc JSON Patch.

## Component palette v0 (inventory)

| `CanvasViewId` | Primary renderer | Notes |
|----------------|------------------|-------|
| `phone_provisioning_form` | `TypedCanvasView` → `PhoneProvisioningView` | Skill-driven. |
| `account_overview` | `TypedCanvasView` → `AccountOverviewView` | Skill-driven. |
| `command_center` | `TypedCanvasView` → `CommandCenterCanvas` | Zoned ops board; staff/admin gate server-side. |
| `welcome`, `service_menu`, `faq_list`, `intake_checklist`, `support_home`, `disambiguation_menu`, … | `SharedCanvasPanel` (legacy metadata path) **or** orchestrator-hydrated `CanvasRenderPayload` with `title` + `data` | Many resolve paths still hydrate structured payloads; pinned canvas passes `CanvasRenderPayload` shape into `TypedCanvasView` (fallback legacy adapter). |
| `dynamic` | Dynamic / MCP-style props | **Restricted** — see below. |
| `schedule`, `pricing_table`, `business_summary`, `custom_card` | Legacy `DynamicViewModel` | Transitional. |
| `show_canvas` (tool) | `ToolRouter` / inline tool row | **Transitional** — not the primary composition path; prefer `canvas.resolve` / `canvas.render`. |

## `dynamic` view policy

- **Classification:** Restricted escape hatch for Shadcn MCP / generative component experiments — **not** the default mental model for product or integrators. **Registered views remain primary**; `dynamic` is an advanced, controlled extension that must not bypass view authority.
- **Entitlement:** Server adds `dynamic` to `allowedCanvasViews` only when `CANVAS_DYNAMIC_VIEW_ENABLED` is `true` or `1` in the runtime environment (see `server/services/siteRuntimeResolver.ts`).
- **Deprecation criteria:** When palette + `command_center` (or successor) covers required demos, remove env gate default-off and require explicit governance PR to enable.

## Legacy `show_canvas` tool

- **Transitional:** Gemini tool `show_canvas` remains a **side channel** (server ack + client metadata / inline `ToolRouter`). It is **not** the authoritative syscall composition path.
- **Primary path:** `POST /api/canvas-control` with `canvas.resolve` → validated `canvas.render` payloads and audit records.
- **Telemetry:** Optional future log when public/session uses `show_canvas` to measure migration (no voice-protocol edits without voice task).

## Narration rules (first-class for composable UI)

Composable surfaces increase **narration drift risk**. The assistant must **not**:

- Describe components or controls **before** they are committed by a successful `canvas.render` / apply path.
- State that a **`canvas.patch`** or **`canvas.action`** succeeded **before** validation and apply complete (or fail closed and say so).
- Imply a control is actionable when the user **lacks entitlement** (plan, security level, allowed action).
- Conflate **presentational** layout changes with **semantic** state unless an action registry entry defines that meaning.

Normative rules:

- **No speech before truth** — Canvas state committed through validated syscalls before `SpeechGroundingContext` is sent to Gemini (see `voiceTurnOrchestrator`, `canvas_grounding` patterns in `server/geminiVoice.ts` — **read-only** for agents; edits are voice-governed).
- The model may only describe UI that has passed validation and been applied (or explicitly acknowledged as unchanged/`noop`).

Surface-specific contracts (e.g. `command_center`) may add stricter lines — see [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) § Narration contract.

## Composition risks & discipline

| Risk | Mitigation |
|------|------------|
| `replace_component` widens into visual drift | Allowlist + future **slot × session-class** matrix (see Command Center spec). |
| `dynamic` becomes the default integration path | Docs + code: env entitlement; treat as advanced class only. |
| Mega-views absorb unrelated UX | Keep `command_center` **semantically narrow**; new concerns → new `viewId` or spec v2. |
| Operators cannot see governance working | Optional **mutation trace** (dev / query flag) + server audit as source of truth — [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) § Operator mutation trace. |

## Human-in-the-loop

- Approval tray / autonomy tiers tie to [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) and `command_center` **`approvals[]`** (`CommandCenterViewModel`) — see [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) § Allowed `canvas.action` and visibility rules.

## Fail-closed

- Unknown `viewId`, disallowed entitlement, unknown patch op, unknown `replace_component.componentType`, or unknown action → **reject** syscall with `CanvasSyscallError` / HTTP 403 from `canvas-control`; audit row records failure.

## Patch / action contract versions

- `canvas.patch` payloads carry optional `patchContractVersion` (default `1.0`). Ops are allowlisted in `shared/canvasViewContract.ts` and validated in Zod + `canvasDirectiveValidator`.
- `canvas.action` payloads carry optional `actionContractVersion` (default `1.0`).
- Extended ops (e.g. `reorder_slots`, `replace_component`, `patch_props`) require contract `1.0` semantics as implemented in code.

## Verification checklist (PRs)

- [ ] New canvas view: extend `CanvasViewId`, `CanvasRenderPayload`, Zod discriminated union, `REGISTERED_VIEW_IDS`, `allowedCanvasViews` (server) where intended, `VIEW_REGISTRY.md`, and client hydration/renderer if user-visible.
- [ ] No new `dynamic` usage without governance review + env entitlement.
- [ ] No new `show_canvas` reliance for features that should be syscall-backed.
- [ ] Voice lockdown files untouched unless the PR is an explicit voice governance task.

## Phased roadmap (reference)

1. **Phase 1 (this doc)** — Single normative spec + cross-links.
2. **Phase 2** — Inventory + `dynamic` entitlement + `show_canvas` documentation (above).
3. **Phase 3** — Versioned `canvas.patch` / `canvas.action` allowlists in validator + types.
4. **Phase 4** — `command_center` view + Tier-1 routing + palette-only renderer.
