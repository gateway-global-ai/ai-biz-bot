---
status: canonical
truth_domain: governance
enforced_by: intent-loop-governance.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-30
spec_id: intent_loop_governance
spec_version: "1.0.0"
---

# Intent Loop Governance v1

## Authority and provenance

**Canonical control-plane spec for intent-as-loop** on the Gateway Global AI OS. This document is the **source of truth** for engineering and Cursor agents.

**Research draft** (long-form analysis, citations, examples): [`user_uploads/governane_plan3_26/plan3_27/intent_loop_plan.md`](../../user_uploads/governane_plan3_26/plan3_27/intent_loop_plan.md) — reference only; if prose conflicts, **this file wins**.

## North star

**Intent is a loop** (stateful, recurrent, evidence-updated), **not** a static label inferred only from the last utterance.

- **Declared intent (design-time)** — Why a swarm exists: templates, schematics, classification policy, capability contracts (`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1`, `HOSPITALITY_SWARM_SCHEMATIC_V1`, YAML registries).
- **Inferred state (runtime)** — Where the session sits now: lifecycle stage, domain journey class, identity, entitlements.
- **Utterance intent (turn-level)** — Evidence that **refines** selection inside the allowed space; it **must not** override role authority, registries, or entitlements by default.

**Policy prevails over uncertainty:** ambiguous or under-privileged requests fail closed, clarify, or hand off — they do not expand the permission surface.

**Voice-first OS (forward-only):** We do **not** treat legacy dashboard/menu UIs as the design target. New surfaces must emerge only through the governed canvas/runtime pipeline — see [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md) (**Forward path** subsection: primary spine, Phase B→C lane, merge gate, server authority, fail-closed, skills binding). **Skills** must stay aligned with **registered canvas views** and **customer journey phases** (entitlements ∩ `VIEW_REGISTRY` ∩ syscall validation); agents compose approved blocks only.

## Minimal state vector (target)

Sufficient to derive “what’s next” **deterministically**, modulo explicit disambiguation:

| Symbol | Meaning |
|--------|---------|
| A | **Actor class** (`customer` \| `employee` \| `vendor` \| `management`) |
| L | **Lifecycle** (customer/employee/vendor: `outreach` → `onboarding` → `operations` → `retention`) or **control** (management: `planning` \| `tracking` \| `reporting` \| `optimization` per [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)) |
| D | **Domain journey** (e.g. hospitality: `in_house`, `upcoming_stay`, … — [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md)) |
| I | **Session identity** (visitor/session/user, trust, auth) |
| E | **Entitlements** (plans, `allowedCanvasViews`, `allowedRuntimeActions`, skills) |
| U_t | **Utterance evidence** (transcript, confidence, channel) |
| R_t | **Active role context** (swarm, `role_type`, `operational_mode`, `swarm_role_contract`) |
| C_t | **Contextual facts** (reservation id, property id, last tool results) |

Typed contract (evolving): [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts).

## Semantic separation: **A**, **L**, and **D** (do not conflate)

These are **different layers** of the state vector. Collapsing them causes illegible traces and wrong merge-order reasoning.

| Layer | Symbol | What it answers | Typical trusted inputs (examples) | **Not the same as** |
|--------|--------|------------------|-----------------------------------|------------------------|
| **Actor** | **A** | *Who* is this interaction for? | `visitor_sessions` security / auth; future role bindings | Workspace claim status alone; PMS guest state |
| **Lifecycle** | **L** | *Where in the relationship / funnel* (business or buyer journey phase)? | `site_configs` workspace + claim; allowlisted `buyer_journey.phase` | Domain journey (`in_house`); “operations” as **tenant** maturity vs **L=operations** |
| **Domain journey** | **D** | *Where in the **vertical timeline*** (e.g. hospitality guest story)? | PMS match, reservation status, verified guest lookup, property-scoped tool results ([`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md)) | “Claimed” site, buyer `activation`, or **L=operations** |

**Anti-patterns (forbidden mentally and in docs):**

- Treating **“workspace claimed”** as equivalent to **D** (e.g. `in_house`) — claim is **tenant / L-shaped**, not guest journey.  
- Treating **L = `operations`** (relationship phase) as equivalent to **“operational” domain state** or **PMS in-house** — same word, different layer.  
- Treating **buyer journey `phase`** as **D** — it is bounded **L** telemetry (B2), not vertical domain journey.

**Implementation note:** The numbered phase **“Phase D — Domain expansion”** below is a **delivery milestone** (hospitality parity, tests). The **symbol D** in the state vector is **domain journey class** — keep both names in mind to avoid confusion.

## Merge order (non-negotiable)

Same order as [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) § Intent-to-surface derivation and [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md):

1. **Classification** — A, L  
2. **Domain** — D, domain facts  
3. **Role** — R_t, `swarm_role_contract`, operational mode  
4. **Tenant** — site policy, E, enabled surfaces/actions  
5. **Turn** — U_t refines within the envelope only  

## Tiered intent loop engine (control plane)

| Tier | Role |
|------|------|
| **0** | Deterministic **gates** — identity, tenant, entitlement; fail closed (`complete mediation`). |
| **1** | **Deterministic routing** — patterns / rules (e.g. [`canvasIntentRouter.ts`](../../server/services/canvasIntentRouter.ts) Tier-1); low latency. |
| **2** | **Inference assist** — local LLM batch, structured extraction, dialogue-state update — **untrusted until validated** against registries. |
| **3** | **Clarification / safe fallback** — disambiguation views, refusal with rationale, handoff. |

**Hybrid architecture (required):** a **central resolver** sets state and constraints; agents/tools operate **inside** the allowed space. No parallel “second router” that bypasses validators.

## Outputs of resolution (contract)

A full `IntentLoopResolution` (when implemented) SHOULD emit:

1. Selected swarm / schematic reference + **version**  
2. Active roles + operational modes  
3. Allowed surfaces (`CanvasViewId` subset) and **slot plans** for composed views  
4. Allowed `actionId`s  
5. **Narration policy** (grounded, sensitive-field rules)  
6. **Audit envelope** — decision id, merge order applied, signal sources, denials  

Today: **partial** realization via `siteRuntimeResolver`, `canvasDirectiveValidator`, `canvasIntentRouter`, and `POST /api/canvas-control`. Hardening is phased below.

## Relationship to existing artifacts

| Artifact | Role |
|----------|------|
| [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) | Intent-to-surface derivation; six registry layers |
| [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) | Slot semantics from classification layer |
| [`AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md`](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md) | A, L taxonomy |
| [`HOSPITALITY_SWARM_RUNBOOK.md`](./HOSPITALITY_SWARM_RUNBOOK.md) | Hospitality D / guest journey |
| [`HOSPITALITY_SWARM_SCHEMATIC_V1.md`](./HOSPITALITY_SWARM_SCHEMATIC_V1.md) | `swarm_role_contract` |
| [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) / [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) | Surface and action authority |
| [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md) | Forward-only doctrine: govern the pipeline that creates UI; skills ↔ views ↔ journey |
| [`EXECUTION_MUTATION_GATE_SPEC_V1.md`](./EXECUTION_MUTATION_GATE_SPEC_V1.md) | Execution-plane boundaries |
| [`.cursor/skills/intent-loop-governance/SKILL.md`](../../.cursor/skills/intent-loop-governance/SKILL.md) | Cursor agent workflow |

## Phased implementation (repo)

**Product spine and decision rule (one screen):** [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md) § **Forward path** — primary lane (Phase B→C), merge gate, server authority, fail-closed surfaces, skills binding.

Phases are **additive**; do not bypass existing validators.

### Phase A — Observe and instrument (low risk)

- [x] Log **structured intent-loop inputs** (A/L/D placeholders, E and routing snippets, transcript **length** only — no raw transcript) on every **`canvas.resolve`** (voice and other clients share this path). One JSON line per resolve: `[intent_loop.phase_a]` + `IntentLoopPhaseAObservation` from [`server/services/intentLoopObservation.ts`](../../server/services/intentLoopObservation.ts). Set `INTENT_LOOP_PHASE_A_LOG=false` or `0` to disable if log volume is an issue.  
- [x] Extend **operator trace** (dev / `?canvasTrace=1`) with **`resolutionSummary`** on `canvas.resolve` — PII-free one-liner via `formatIntentLoopResolutionSummary` in [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts); Concierge trace strip shows `loop=…`.  
- [x] **Signal sources (normative):** **`site_runtime`** — `resolveSiteRuntime` → plan, workspace, allowed view lists; **`visitor_session`** — authoritative `securityLevel` / `authState` when `visitorId` is present (`canvasDirectiveValidator`); **`envelope_security_hint`** — client envelope hints (non-authoritative); **`transcript_metrics`** — character count only; **`canvas_intent_router`** — tier (`intentRouterTier`), selected view, render mode. **PMS / guest journey** — not in Phase A vector yet (future: domain journey from hydration/tool path).  
- [x] **`decisionReasonCodes`** — stable enum-style tags on each Phase A observation for log analytics (`INTENT_LOOP_DECISION_REASON_CODES` in [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts)); **not** folded into `resolutionSummary` (strip stays compact). New codes require contract + doc update. Lifecycle-specific codes ship in **Phase B2** (`lifecycle_from_*`).

### Phase B1 — Actor classification (observe-only)

**PR-style name:** Intent Loop Phase B1 — Actor Classification Observation Only.

**Authority rule:** Actor classification may become **observationally** grounded only from **trusted session / site / runtime** evidence in Phase B1. **Transcript** (or other turn-local NL) may assist **later** phases; it **must not** override stronger identity or security signals from `visitor_sessions` + `validateCanvasSyscall`.

- [x] Every **`canvas.resolve`** observation includes **`stateVectorHints.actorClass`**, **`actorSource`**, **`actorConfidence`**, plus **`actorHypothesis`** (logs/JSON only) when `actorClass === unknown`.  
- [x] Provenance codes: **`actor_from_session`**, **`actor_from_security_context`**, **`actor_unknown`**, plus **`actor_channel_hint_diverged`** / **`actor_client_hint_diverged`** when hints disagree (observe-only). **`actor_from_site_role`** is reserved until owner↔visitor (or equivalent) binding exists — **not emitted** in B1.  
- [x] **No** routing, entitlement, swarm, or default UI semantic changes — telemetry and API `resolutionSummary` / JSON only.  
- [x] Implementation: [`server/services/intentLoopActorObservation.ts`](../../server/services/intentLoopActorObservation.ts), probe on [`canvasDirectiveValidator.ts`](../../server/services/canvasDirectiveValidator.ts) (`visitorSessionProbe`), optional envelope hint [`context.intentLoopActorChannel`](../../shared/canvasViewContract.ts) (non-authoritative).

**Bright line — hypothesis fields:** `actorHypothesis`, `lifecycleHypothesis`, and (Phase B3+) `domainHypothesis` are **observability-only** until explicitly blessed for downstream use. **`actorClass`**, **`lifecycleStage`**, and **`domainJourneyKey`** (when populated) are the governed observation fields for merge-order work later; hypotheses must not become “soft truth” in routing or entitlements by accident.

### Phase B2 — Lifecycle observation (observe-only)

**PR-style name:** Intent Loop Phase B2 — Lifecycle Observation Only.

**Authority rule:** Lifecycle classification may become **observationally** grounded only from **trusted site identity, structured session JSON, and runtime** evidence in Phase B2 — **not** from vertical **D** (domain journey) or transcript. **Turn-level utterance** evidence may assist **later** phases; it **must not** override `site_configs`-derived identity or allowlisted `visitor_sessions.buyer_journey` JSON. See **§ Semantic separation: A, L, and D** — **L** is not **D**.

- [x] **`lifecycleStage`**, **`lifecycleSource`**, **`lifecycleConfidence`** on each observation; **`managementControlStage`** present but **unknown** for management actors until control-plane signals exist.  
- [x] **Sources:** **`lifecycle_from_site_workspace`** — `workspaceState` + `claimStatus`; **`lifecycle_from_buyer_journey`** — allowlisted `phase` string inside `buyer_journey` (same DB round-trip as security). **Precedence:** for `employee`, site only; for `customer` / `vendor` / `unknown`, buyer journey wins when parseable, else site.  
- [x] **`lifecycle_unknown`** when weak; **`lifecycleHypothesis`** only in logs/JSON (same discipline as `actorHypothesis`).  
- [x] **No** routing, entitlement, swarm, or UI behavior changes.  
- [x] Implementation: [`server/services/intentLoopLifecycleObservation.ts`](../../server/services/intentLoopLifecycleObservation.ts); probe extended in [`canvasDirectiveValidator.ts`](../../server/services/canvasDirectiveValidator.ts) (`buyerJourneyPhase`).

### Phase B3 — Domain journey observation (observe-only)

**PR-style name:** Intent Loop Phase B3 — Domain Observation Only.

**Authority rule:** **D** (domain journey class) may become **observationally** grounded only from **trusted vertical evidence** on the **existing canvas resolve chain** — not from transcript, generic site category, workspace claim, buyer journey phase (**L**), or UI state. **D** classifies **business vertical journey context** (e.g. hospitality guest journey), **not** the user’s role (**A**), **not** lifecycle (**L**), and **not** general site state.

**Allowed evidence sources for B3 (narrow — do not widen casually):**

- Allowlisted **`visitor_sessions.buyer_journey.intent_loop_domain_v1`** JSON (Zod-validated), written only by **trusted server paths** (e.g. PMS guest-journey tool completion persisting `computeGuestJourneyClassification` output).  
- Future: additional trusted PMS lookup outputs or reservation/stay records **only** if they are first-class fields on the same resolve chain (documented here when added).

**Explicitly excluded from elevating D above `unknown`:**

- Free-text agent summaries, model-inferred “looks like a hotel,” or transcript.  
- **`buyer_journey.phase`** (that is **L**, B2).  
- Workspace claim status, `workspaceState`, or tenant maturity.  
- Generic **`businessType`** / category guesses without vertical tool evidence.  
- Client envelope or UI-only state.

- [x] **`domainJourneyKey`**, **`domainSource`**, **`domainConfidence`**, **`domainReasonCodes`** on each observation; provenance code **`domain_from_pms_guest_journey_v1`** when the allowlisted snapshot is present; else **`domain_unknown`**.  
- [x] Optional **`domainHypothesis`** reserved — same bright line as `actorHypothesis` / `lifecycleHypothesis` (not populated until a governed weak-signal path exists).  
- [x] **No** routing, entitlement, swarm, or UI behavior changes in B3.  
- [x] Implementation: [`server/services/intentLoopDomainObservation.ts`](../../server/services/intentLoopDomainObservation.ts), snapshot parse [`server/services/intentLoopDomainSnapshot.ts`](../../server/services/intentLoopDomainSnapshot.ts), probe extension in [`server/services/canvasDirectiveValidator.ts`](../../server/services/canvasDirectiveValidator.ts). Until a writer persists **`intent_loop_domain_v1`**, production observations remain **`domain_unknown`** for most sessions.

### Phase B — Resolver service (control plane)

- [ ] Implement `IntentLoopResolver` (e.g. `server/services/intentLoopResolver.ts`) returning `IntentLoopResolution` from [`shared/intentLoopContract.ts`](../../shared/intentLoopContract.ts).  
- [ ] **Wire after** Tier-0/Tier-1 checks; Tier-2 outputs pass through Zod + policy.  
- [ ] Optional: `SwarmPairingService` if selection logic exceeds a single module.  
- [ ] **New routes** only in `server/routes/` (e.g. `intentLoopRoutes.ts`) — **not** `routes.ts` body; mount in monolith with single `app.use` line if needed.

### Experience grounding invariant (active canvas continuity)

**Problem:** When `canvasIntentRouter` returns Tier 3 noop (`selectedViewId` empty), the merge step used to pair that with `allowedCanvasViewIds: []`, which **de-grounded** narration and pushed the model into generic conversational behavior — even if the UI still showed an intent-bound surface (e.g. `canvas_backgrounds`).

**Invariant:** While an entitled canvas experience is active, ambiguous follow-up turns must **not** collapse the allowlist to empty solely because global routing missed, unless the user **explicitly exits** or the system **denies** with a governed reason.

**Implementation (runtime):**

1. **Router — experience-first:** [`server/services/experienceContinuity.ts`](../../server/services/experienceContinuity.ts) `tryActiveExperienceContinuity` runs **before** Tier 0/1/2/3 when `envelope.context.currentViewId === canvas_backgrounds` and the transcript is not an explicit exit; returns noop + picker-scoped speech (no full re-render).
2. **Resolver — prior view pin:** [`server/services/intentLoopResolver.ts`](../../server/services/intentLoopResolver.ts) accepts `priorActiveViewId` from the syscall envelope; when the router proposes no view but `priorActiveViewId` is entitled and registered, **`allowedCanvasViewIds`** is pinned to `[priorActiveViewId]` with audit `continuity:prior_view_preserved:*`.
3. **Merge — speech repair:** [`mergeCanvasResolveWithIntentLoopResolution`](../../server/services/intentLoopResolver.ts) replaces Tier-3 de-grounding speech when the resolver pinned a single entitled view but the router returned noop.

**Observability:** Set `CANVAS_RESOLVE_SUMMARY_LOG=1` for one-line JSON summaries from [`server/routes/canvasControlRoutes.ts`](../../server/routes/canvasControlRoutes.ts) (`event: canvas.resolve.summary`).

### Phase C — Surface derivation

- [ ] `SurfaceDerivationService` or equivalent: default `CanvasViewId`, `command_center` slot fill rules from resolution + [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md).  
- [ ] Feed **existing** `canvasIntentRouter` / hydration; do not duplicate validator logic client-side as authority.

### Phase D — Domain expansion

- [ ] Hospitality customer journey end-to-end tests; parity with chat/voice where in scope.  
- [ ] Version **bundle_version** / contract mismatches → fail closed or safe mode (see research plan § risks).

## Verification (PRs)

- **Fail-closed (Phase B → Phase C):** If `allowedCanvasViewIds` is empty, the resolver must pair that state with **non-empty `auditNotes`** (denial, clarification, or documented fallback intent). For derivation, prefer registry fallbacks already validator-approved — `disambiguation_menu`, `support_home`, `welcome` — see [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md) § Fail closed and [`shared/intentLoopResolutionSchema.ts`](../../shared/intentLoopResolutionSchema.ts) (`INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS`, `assertResolutionForSurfaceDerivation`). Prefer machine-readable **`auditNotes` line prefixes** (`INTENT_LOOP_AUDIT_NOTE_PREFIXES`, e.g. `deny:`, `registry:`, `noop:`) so Sub-agent B and operators stay aligned.
- [ ] Any new surface or action: **VIEW_REGISTRY** + **ACTION_REGISTRY** + validator tests.  
- [ ] Resolver changes: deterministic tests **same input vector → same resolution** (modulo explicit randomness forbidden in Tier-1).  
- [ ] Missing entitlement → deny with audit reason.  
- [ ] Customer-facing / voice paths: no new dependencies on local LLM; see [`local-agent-governance.mdc`](../../.cursor/rules/local-agent-governance.mdc).  
- [ ] Voice lockdown files unchanged without explicit voice governance task.

## Cursor agents: governance and coding split

| Work type | Owner | Rule / skill |
|-----------|--------|----------------|
| Docs, registry, phase plan, review | Primary Cursor agent + **governance-linter** / **governance-review** skills | `preflight-review-required.mdc`, `intent-loop-governance.mdc` |
| Implementation code in allowed jurisdictions | **`local_agent_plane`** (`coding_agent` / `ui_agent`) | `local-agent-governance.mdc` — orchestration run required; **no** customer/voice paths |

**Sub-agent pattern:** Use the **Task** tool or explicit skill invocation for bounded slices (e.g. “implement `intentLoopResolver` draft types only”). Do not treat the local model as authority for policy.

## Related

- [`GOVERNANCE_EXECUTION_PLAN_V1.md`](./GOVERNANCE_EXECUTION_PLAN_V1.md) — platform phase map; intent loop is a **control-plane track** inside Phases 4–5+  
- [`INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`](./INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md)  
- [`SYSTEM_MANIFEST.md`](./SYSTEM_MANIFEST.md)
