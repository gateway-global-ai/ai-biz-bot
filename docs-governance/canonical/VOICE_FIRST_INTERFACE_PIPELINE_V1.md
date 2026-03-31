---
status: canonical
truth_domain: governance
enforced_by: intent-loop-governance.mdc, canvas-os-tool-mandate.mdc, governed-ui-sdk.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-30
---

# Voice-First Interface Pipeline (v1)

## Forward path (primary implementation spine)

**Runtime truth:** `voice → resolve intent loop → derive registered surface → render typed payload`. Detailed phases and mechanics live in [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md); **this section** is the one-screen product direction and decision rule.

### Decision rule (default filter for all new work)

If it does **not** strengthen **voice → canvas resolve → registered view → typed payload**, it is **secondary** unless it **contaminates** an active runtime path (security, billing, voice stability, or registry integrity).

### Active implementation lane (Phase B → Phase C)

Until resolver and surface derivation are **shipped and wired**, treat **Phase B (`IntentLoopResolver`) and Phase C (surface derivation)** as the **only** active customer-OS implementation lane:

- **No** parallel “helpful” UI work that invents new canvas trees outside **registered derivation**.
- **No** new `CanvasViewId`s **consumed** at runtime without **VIEW_REGISTRY** + validator + (where applicable) syscall path.
- **No** resolver-adjacent shortcuts in **clients** — no second authority for “which view wins.”

Observation-only phases (A, B1–B3) are **telemetry foundations**; they do not replace a governed resolution object.

### Phase B output = merge gate for Phase C

Before implementation work on Phase C proceeds in earnest, **freeze the minimum `IntentLoopResolution`** ([`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts)) required to drive surface selection. At minimum, Phase C consumers must be able to rely on:

| Field | Role for Phase C |
|-------|------------------|
| `contractVersion`, `resolutionId` | Versioning and audit correlation |
| `stateVector` | A/L/D (and entitlements) after merge order |
| `mergeStepsApplied` | Audit: which steps ran |
| `allowedCanvasViewIds` | **Non-ambiguous input** to derivation (may be a singleton; may be empty only when paired with an explicit **denial / fallback** policy — see below) |
| `allowedActionIds` | Executable actions consistent with resolution |
| `swarmSchematicRef` | When swarm-scoped behavior applies |
| `auditNotes` | Denials, clarifications, unsupported states |

If Phase B and Phase C are built with **different assumptions** about these fields, **stop and align types + docs first** — not more UI.

### Phase C is server-authoritative

- The **client** may **hydrate and render** payloads it receives through governed channels.
- The **client** does **not** decide **view authority** or override entitlements.
- **`canvasDirectiveValidator`**, **`canvasIntentRouter`**, and resolver outputs on the **server** remain the **authority** for what is allowed; clients do not become a second router.

### Fail closed when resolution cannot map to a registered surface

If the resolver **cannot** produce a valid **registered** surface (empty `allowedCanvasViewIds` with no allowed fallback, contradictory entitlements, or unsupported state), the system **must not improvise**. It must use a **controlled** path: explicit **clarification / refusal / safe default** view ids that are **already** in the registry and validator-approved — with **audit** in `auditNotes` (and related logs). “Best effort” rendering from model prose is **out of scope** for product truth.

### Skills: operational binding to surfaces

- If a **skill** changes what the user **should see**, the skill / capability row **must** declare **registered surface implications** (which `CanvasViewId`s, which journey phase, which entitlements).  
- If a skill has **no** UI surface consequences, that should be **explicit** in registry or schematic metadata (“data-only skill”) so reviewers do not guess.

This removes ambiguity between **skills ↔ views ↔ journey**.

---

## The distinction (read first)

We are **not** running a program to “modernize legacy UI” or polish pre-intent dashboards and menu-driven screens. Those surfaces are **deprecated as the product design target** in favor of a **voice-first, intent-driven AI OS**.

The **optimization target** is the **system that is allowed to produce the next interface** — not a cleanup campaign on old screens unless a legacy path is still on the **active runtime** and can **contaminate** governed work.

| Wrong question | Right question |
|----------------|----------------|
| How do we clean up all old interfaces? | How do we make it **impossible** for the next interface to be created **outside** the governed voice-first OS pipeline? |
| Which dashboard should we restyle? | Which **syscall, view id, validator, and SDK export** gate the next pixel? |

## Product model (normative)

1. **Voice** is the **primary interaction layer** (Gemini Live / Concierge — see execution-plane rules).
2. **Canvas** is an **OS execution surface** — syscall-backed, registry-bound, not a generative artboard ([`CANVAS_OS_TOOL_MANDATE_V1.md`](./CANVAS_OS_TOOL_MANDATE_V1.md)).
3. **New customer-visible UI** is produced only through **governed runtime patterns**: registered views, typed payloads, approved actions, validated `canvas.*` syscalls — see [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) and [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md).
4. **Agents do not invent UI.** They **compose** from approved OS-level building blocks; if a surface is not registered and approved, it **does not render** as product truth ([`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md), [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md)).

## Enforcement points (forward)

| Layer | Lock |
|-------|------|
| **Canvas / syscall** | Only registered `CanvasViewId`s; typed payloads; `canvasDirectiveValidator`; no freeform agent HTML/DOM ([`shared/canvasViewContract.ts`](../../shared/canvasViewContract.ts)) |
| **Intent loop** | Merge order A/L/D → role → tenant → turn; utterance refines only ([`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md)) |
| **Governed UI generation** | **Design-time:** Shadcn MCP discovery → promotion → SDK (see [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](./SHADCN_MCP_PLANE_BOUNDARY_V1.md)). **Runtime:** no MCP catalog — only **`@gateway/canvas-sdk`** / registered views; token-only styling; fail closed on unapproved output ([`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](./VISUAL_INTEGRITY_GOVERNANCE_V1.md)) |
| **Approval plane** | Approved components, style primitives, view contracts; explicit promotion ([`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md), [`STYLE_APPROVAL_POLICY_V1.md`](./STYLE_APPROVAL_POLICY_V1.md)) |

## Skills, journey phases, and canvas views (binding)

Swarm **skills** and **capability sets** must remain aligned with **canvas affordances**:

- For each **customer journey phase** (A/L/D and vertical **D** where applicable), **allowed `CanvasViewId`s** and **actions** must be consistent with entitlements and registry rows — not “whatever the model draws.”
- New skills that imply new UI **require** corresponding **view registry** / syscall / SDK promotion work so the runtime can render support for that skill **deterministically**.

Sources: [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md), [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md), [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md), [`registry-yaml/`](../../registry-yaml/) capability and schematic YAML.

## SDK framing

**`@gateway/canvas-sdk`** is an **OS surface SDK for future runtime-generated, approved interfaces** — not a generic “component library for the old app.” Exports are **promoted** through the approval registry; they exist to make the **pipeline** default-correct, not to restyle legacy shells.

## Related

- [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md) — phased implementation (A–D), resolver, surface derivation detail
- [`INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`](./INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md)
- [`packages/canvas-sdk/README.md`](../../packages/canvas-sdk/README.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
