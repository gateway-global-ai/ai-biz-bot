---
status: canonical
truth_domain: runtime
enforced_by: none (review + CI + incremental code adoption)
backed_by:
  schema: true
  service: true
  route: false
last_verified: 2026-03-28
---

# Execution mutation gate spec v1

## Purpose

Turn “governed OS” from **documentation** into **enforceable engineering**: every **mutation** (UI/canvas state, persistent data, external integrations) must pass through a **registered execution path** with a **stable envelope**, auditable `routeOrSource`, and explicit **caller** attribution.

This spec complements:

- **`executionContractEngine`** (`server/services/executionContractEngine.ts`) — today focused on **admission** for specific HTTP surfaces (e.g. hospitality Phase 1 on intelligence routes). **Expand kinds here; do not fork a second admission engine.**
- **Canvas syscall plane** — `POST /api/canvas-control` already gates **canvas** mutations; this spec generalizes the **principle** to tool dispatch and integrations.

## Critical clause (normative)

**Execution gate requirement**

All mutations to:

- **Canvas / session UI state** (pinned canvas, embedded shell views driven by server contract),
- **Persistent platform data** (agents, site configs, knowledge, billing state, orchestration records),
- **External systems** (e.g. Cloudbeds, Stripe, Twilio sends, email),

**MUST** be executed through a path that:

1. Validates a **versioned envelope** (Zod or equivalent at the boundary),
2. Resolves **tenant / site / actor** context authoritatively (not from model text alone),
3. Applies **registry or contract admission** where a kind is registered,
4. Emits **audit metadata** (`routeOrSource`, `transport`, `caller.actor`, optional `correlationId`).

Any direct mutation outside this pattern is a **governance breach**: must be **blocked** when feasible, or **logged** as a violation with a remediation ticket. “Mostly governed” is **not** acceptable for production-critical surfaces.

**Models (Gemini, etc.)** — **suggest** tool calls and payloads; they **do not** constitute authorization to execute. Execution happens only after orchestration normalization and gate validation.

## Trusted context enrichment (normative)

Orchestration may **enrich** model-proposed tool args with **trusted** session context (e.g. injecting `siteConfigId` for site-anchored tools in `geminiVoice.ts` before building the mutation payload).

Rules:

1. The **model supplies proposal args**; the gate receives the payload **after** deterministic enrichment where applicable.
2. **Trusted** fields come only from server/session state (setup handshake, Twilio binding, auth), not from unconstrained model text as the source of truth for tenancy.
3. **Model-originated values must never override trusted tenancy identity** (e.g. model-hallucinated `siteConfigId` must not replace the session’s resolved site).
4. Enrichment must be **deterministic and attributable** (same inputs → same injection; log/metric includes `routeOrSource` / `siteConfigId` when present).

## Observability (lightweight metrics)

**Purpose:** answer “which route stresses or violates the gate?” before PSTN and skill dispatch join the same primitive.

**Implementation:** `server/services/executionMutationGate.ts` emits one JSON line per outcome, prefix `[mutation_gate]`, field `metric_group: "mutation_gate"`, and `evt` one of:

| `evt` | Level | Use |
|-------|--------|-----|
| `mutation_gate.invalid_envelope` | warn | Malformed proposal / Zod failure |
| `mutation_gate.execution_failed` | error | Valid envelope; handler threw |
| `mutation_gate.executed` | log | Successful dispatch through gate |
| `mutation_gate.unsupported_mutation_kind` | warn | Dispatcher gap (future kinds) |

**Dimensions (when available):** `routeOrSource`, `transport`, `capability`, `actor`, `correlationId`, `voiceSessionId`, `siteConfigId`, `reason`, `code`.

Callers may pass **`mutationGateLogContext`** (`ExecuteContractOptions`) so parse failures still bucket by path/session.

**Not in scope v1:** Prometheus counters, sampling policy, or log volume SLOs — add when central observability owns the schema.

## Responsibility matrix

| Stage | Role |
|-------|------|
| Model | Suggest (tool JSON, text) |
| Orchestration | Decide (call gate vs refuse) |
| Contracts / registry | Authorize (kind, capability, allowlist) |
| Execution | Act (handler, syscall, HTTP to vendor) |

## Canonical code (v1)

| Artifact | Role |
|----------|------|
| `shared/executionMutationGate.ts` | Zod envelope + `parseExecutionMutationRequest` — **shared type law** for mutation requests. |
| `server/services/executionMutationGate.ts` | `executeContract(raw, opts)` — parse → dispatch (v1: `gemini_tool_invocation` → `handleToolCall`); structured **`mutation_gate.*`** logs; optional **`mutationGateLogContext`** for session-scoped metrics on parse failure. |

**Extension rule:** New mutation kinds (e.g. `integration_capability_invocation`) are added as **discriminated** `mutationKind` variants in `shared/executionMutationGate.ts`, then implemented in `executeContract` (or a single internal dispatcher) **without** duplicating ad hoc route switches.

## What counts as a mutation

| Class | Examples | Gate |
|-------|-----------|------|
| Canvas / multimodal UI | `canvas.render`, `canvas.patch`, pinned payload apply | `canvasDirectiveValidator` + `canvasControlRoutes` |
| Tool side effects | CRM search, Stripe, PMS read/write, email | `executeContract` → `handleToolCall` / future capability dispatcher |
| Control plane | Provision swarm, orchestration runs | `validateExecutionContract` on `intelligenceRoutes` (+ expand kinds) |
| Client-only display from raw model output | Rendering unvalidated JSON as UI | **Violation** if it drives privileged or contractual UI |

Canvas is **state mutation**, not a “safe” side channel.

## Migration tracker (adoption)

Living checklist: update **Status** when a row is merged; assign **Owner** in your sprint board (repo does not enforce owner strings).

| Route / file | Current state | Required migration | Owner (team) | Status |
|--------------|---------------|--------------------|--------------|--------|
| `server/geminiVoice.ts` | Model `functionCall` → `executeContract` → `handleToolCall`; `routeOrSource` = upgrade path (`/ws/gemini-live`, `/ws/os-live`, `/ws/browser-voice`); `caller.actor` = `model_proposal` | Hardening only (stricter kinds, optional `persistOrchestrationViolation` on gate failure) | Voice / platform | **Done** (browser Live unified WSS) |
| `server/services/toolHandler.ts` | Sole executor for `gemini_tool_invocation` today | Keep logic here; ensure **all** Live/tool entry points use `executeContract` first; later split capability dispatch | Orchestration | Queued |
| `client/.../ConciergePanel.tsx`, `ToolRouter.tsx`, `SharedCanvasPanel.tsx` | Legacy canvas / metadata paths | Fence demo; syscall-only pinned canvas; typed tool metadata | UI / voice | Queued |
| `server/voiceStream.ts` + PSTN bridge | Partial parity with browser | Same envelope + `executeContract` (or equivalent) at execution moment | Transport / voice | Queued |
| `server/routes/skillDispatchRoutes.ts` | Zod + branches | Align YAML; optional `mutationKind` for skill dispatch | Integrations | Queued |
| `server/aiStudioProxy.ts` | Parallel Live setup | Document + avoid new mutations until gated | Voice | Queued |

## Violation map (likely locations — audit with diffs)

Evidence from discovery packs (`user_uploads/governane_plan3_26/`) and codebase survey. Use this as a **checklist** for refactors and CI.

| Area | Risk | Notes |
|------|------|------|
| `server/geminiVoice.ts` | ~~Direct `handleToolCall`~~ | **Bridged:** `executeContract` with Zod envelope, `routeOrSource` from request path, `caller: model_proposal`, structured logs on `INVALID_ENVELOPE` / `EXECUTION_FAILED`. |
| `server/services/toolHandler.ts` | Direct DB / vendor calls from tool name switch | Acceptable **if and only if** every caller passes through `executeContract` (or canvas/skill routes with equivalent validation). |
| `client/src/components/chat/ConciergePanel.tsx` | `applyCanvasPayload` from tool metadata; local `setPinnedCanvas` | Bypass of syscall validator; fence for demo; remove or gate. |
| `client/src/components/voice/tools/ToolRouter.tsx` | `metadata: any` → UI | Typed discriminant required at boundary. |
| `client/src/components/voice/tools/SharedCanvasPanel.tsx` | CTAs → `onTriggerSpeech` / `onContextUpdate` strings | Server-validated `canvas.action` or skill dispatch only, for governed demos. |
| `server/routes/twilioWebhooks.ts` | Inbound handlers | **Lockdown** — must not call Cloudbeds/Stripe directly; dispatch through router/services that satisfy this spec. |
| `server/voiceStream.ts` / PSTN bridge | Tool or data execution | Same mutation graph as browser at execution time. |
| `server/routes/skillDispatchRoutes.ts` | Skill branches | Align with `skill-dispatch-registry.yaml`; consider calling `executeContract` with `mutationKind` skill variant. |
| `server/aiStudioProxy.ts` | Parallel Live path | Document governance status; avoid new side effects until aligned with this spec. |

## Violation handling

1. **Detect** — structured log: `governance_breach`, `breach_class`, `routeOrSource`, `capability`, `siteConfigId` (if any).
2. **Record** — where orchestration violations exist, reuse `recordContractViolation` / `persistOrchestrationViolation` patterns.
3. **Remediate** — route through `executeContract` or an existing validated route (canvas-control, intelligence with execution contract).

## Acceptance criteria (incremental)

1. `parseExecutionMutationRequest` rejects malformed envelopes in tests.
2. `executeContract` successfully runs at least one **read-only** tool path in CI (no secrets required).
3. New tool or integration work **defaults** to adding dispatch through the gate unless explicitly exempted in this doc with rationale.
4. Browser Gemini Live tool proposals on the unified voice WSS enter only via `executeContract` (`npm run test:execution-mutation-gate` + voice QA on tool-heavy sessions).

## Related

- [`VOICE_EXECUTION_ARCHITECTURE_V1.md`](./VOICE_EXECUTION_ARCHITECTURE_V1.md)
- [`CONTROL_PLANE_UNIFICATION_PLAN_V1.md`](./CONTROL_PLANE_UNIFICATION_PLAN_V1.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md)
