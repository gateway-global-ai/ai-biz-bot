---
name: intent-loop-governance
description: Intent-as-loop control plane — state vector, merge order, phased resolver; use when changing canvas intent routing, swarm pairing, surface derivation, or INTENT_LOOP / GGUI docs. Splits governance review from local-LLM coding per local-agent-governance.
---

# Intent Loop Governance (Cursor)

## When to use

- Editing **intent loop** behavior: `canvasIntentRouter`, `canvasDirectiveValidator`, `intentLoopObservation`, `intentLoopActorObservation`, `intentLoopLifecycleObservation`, `intentLoopDomainObservation` / `intentLoopDomainSnapshot`, site runtime / voice turn orchestration that feeds canvas, or new **`IntentLoopResolver`** / surface derivation.
- Authoring or changing **`INTENT_LOOP_GOVERNANCE_V1.md`**, **`GOVERNED_GENERATIVE_UI_SPEC.md`** intent sections, **`COMMAND_CENTER_SURFACE_SPEC_V1.md`**, or **`INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`**.
- Planning **swarm pairing**, **tiered engine** (gates → rules → inference assist → clarify), or **audit/trace** for resolution.

## Read first (order)

1. [`docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md`](../../docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md) — **source of truth**
2. [`docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](../../docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md) — **forward-only**: govern the pipeline that creates UI; skills/views/journey alignment; not legacy dashboard repair
3. [`docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md`](../../docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md) — registry layers, intent-to-surface derivation
4. [`docs-governance/canonical/COMMAND_CENTER_SURFACE_SPEC_V1.md`](../../docs-governance/canonical/COMMAND_CENTER_SURFACE_SPEC_V1.md) — slot semantics
5. [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts) — typed contract (`intent_loop.v1`)
6. Research draft (non-authoritative): [`user_uploads/governane_plan3_26/plan3_27/intent_loop_plan.md`](../../user_uploads/governane_plan3_26/plan3_27/intent_loop_plan.md)

**A / L / D — do not conflate:** **A** = actor class (who). **L** = relationship / buyer-funnel phase (site + allowlisted `buyer_journey` — not PMS guest state). **D** = vertical domain journey (e.g. hospitality `in_house` — PMS / reservation / verified guest; **not** “workspace claimed” and **not** L). See canonical **§ Semantic separation**.

**Phase A + B1 + B2 + B3 (instrumentation):** each `canvas.resolve` emits `[intent_loop.phase_a]` JSON logs (`decisionReasonCodes`, **A** / **L** / **D** fields; optional **`actorHypothesis`** / **`lifecycleHypothesis`** when unknown — hypotheses **logs only** until blessed). **D** uses allowlisted `visitor_sessions.buyer_journey.intent_loop_domain_v1` when present; otherwise `domain_unknown` (see canonical § B3 allowlist). Compact `resolutionSummary` includes `lc=…` and `dj=…`. Env `INTENT_LOOP_PHASE_A_LOG=false` disables server logs only. Tests: `npm run test:intent-loop-decision-reasons`, `npm run test:intent-loop-actor-observation`, `npm run test:intent-loop-lifecycle-observation`, `npm run test:intent-loop-domain-observation`.

## Governance vs implementation

| Task | How |
|------|-----|
| Policy, registry, canonical doc, phase checklist | Primary agent + **governance-linter** / **governance-review** skills; **preflight-review-required** |
| TypeScript implementation in `server/services/**`, `shared/**`, `client/**` (allowed jurisdictions) | **Local agent plane** — see **local-agent-governance**: `agent_orchestration_runs`, jurisdiction, structured output; **never** voice lockdown or customer-facing Gemini bypass |
| Exploratory codebase search | Task **explore** subagent or direct search |

## Hard rules

- **Policy prevails over utterance** — ambiguous or under-privileged input → fail closed, clarify, or hand off; do not expand entitlements from raw text alone.
- **Merge order** — classification → domain → role → tenant → turn (see canonical doc).
- **No new routes in `server/routes.ts` body** — modular `server/routes/*.ts` + mount line only.
- **Voice pipeline** — frozen per **sovereign-voice-lockdown**; intent loop work must not change handshake, sample rates, or protected voice files without an explicit voice task.
- **Customer-facing runtime** — Gemini only; local LLM is **internal worker** only.

## Sub-agent pattern (Cursor)

Use **bounded Task** prompts, e.g.:

- *Explore*: “Map all call sites of `canvasIntentRouter` and `siteRuntimeResolver` for canvas.”
- *Implement* (local plane): “Add `intentLoopResolver.ts` skeleton returning `IntentLoopResolution` from `shared/intentLoopContract.ts`; no route registration.”

Each coding slice must respect **jurisdiction** in `local-agent-governance.mdc`.

## Verification before merge

- Validator / integration registry scripts if touching capabilities or tool exposure.
- Deterministic tests for Tier-1 routing where applicable.
- VIEW_REGISTRY / ACTION_REGISTRY updates for new surfaces or actions.
