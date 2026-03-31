# Intent loop Phase B → C — sub-agent prompt pack

**Canonical context:** `docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md` (§ Forward path), `docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md` (§ Phase B, Phase C, Verification).

**Order:** run **sequentially**. Do not start Phase C implementation until Phase B delivers a stable `IntentLoopResolution` merge gate.

---

## 0) Orchestrator (meta-prompt — human or lead agent)

You are orchestrating the **voice-first intent loop** implementation. The runtime spine is:

`voice → canvas resolve → IntentLoopResolver (Phase B) → surface derivation (Phase C) → typed payload render`.

**Rules:**

1. Run sub-agents **in the numbered order** below. Each agent receives **only** its prompt block; pass file paths from the repo root: `/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai` (or relative paths).
2. **Gate:** Sub-agent 2 output (merge gate + `intentLoopResolver.ts` skeleton or full impl) must exist before Sub-agent 3 does heavy Phase C work.
3. **Forbidden without explicit voice governance task:** edits to `server/geminiVoice.ts`, `server/voiceStream.ts`, `server/voiceGemini.ts`, `server/voiceSession.ts`, `server/audioCodec.ts`, `server/config/geminiLiveProtocol.ts`, `client/src/services/voice/**`.
4. **No new routes** inside `server/routes.ts` body — only `import` + `app.use` mount for new routers.
5. After each sub-agent: run `npm run check` or project typecheck/tests relevant to touched files; fix regressions before the next agent.

---

## 1) Sub-agent A — Merge gate: contract + Zod + fail-closed policy (small PR)

**Goal:** Lock **Phase B → Phase C** assumptions in code and types so B and C cannot diverge.

**Read first:**

- `shared/intentLoopContract.ts` — `IntentLoopResolution`, `IntentLoopStateVector`
- `docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md` — § Forward path (Phase B output table, fail-closed rule)
- `server/services/canvasDirectiveValidator.ts` (entry points for resolve chain)
- `server/services/canvasIntentRouter.ts`

**Deliver:**

1. **Zod schemas** (or extend existing) for `IntentLoopResolution` and any nested pieces that Phase C will consume — export from `shared/` or `server/services/` as appropriate; keep in sync with `intentLoopContract.ts`.
2. **Document in a short comment block** (or one paragraph in `INTENT_LOOP_GOVERNANCE_V1.md` Verification if truly normative) the **fail-closed** behavior: when `allowedCanvasViewIds` is empty, what **registry-approved** fallback view ids and `auditNotes` shape are required — align with existing `VIEW_REGISTRY` / validator capabilities.
3. **No** full resolver logic yet unless trivial stubs — focus on **merge gate** and validation helpers: `parseIntentLoopResolution`, `assertResolutionForSurfaceDerivation`, etc.

**Out of scope:** UI components, client-only routing authority, new CanvasViewIds without registry.

**Success criteria:** Typecheck passes; Phase C author can import schemas and know exact fields.

---

## 2) Sub-agent B — Phase B: `IntentLoopResolver` service

**Goal:** Implement `server/services/intentLoopResolver.ts` (name may match repo conventions) that returns **`IntentLoopResolution`** per `shared/intentLoopContract.ts`.

**Read first:**

- `INTENT_LOOP_GOVERNANCE_V1.md` — merge order, Phase B checklist, Tier table
- `server/services/intentLoopActorObservation.ts`, `intentLoopLifecycleObservation.ts`, `intentLoopDomainObservation.ts` — how observations attach today
- `server/services/canvasDirectiveValidator.ts` — where to **invoke resolver after** Tier-0/Tier-1; do not duplicate tier logic inside resolver for no reason
- `server/services/siteRuntimeResolver.ts` — entitlements / allowed views if relevant

**Deliver:**

1. **`resolveIntentLoop(...)`** (signature you design) producing `IntentLoopResolution` with **deterministic** outputs for the same inputs (no random ids except `resolutionId` if using uuid — document).
2. Populate **`mergeStepsApplied`**, **`stateVector`** (from trusted signals + merge order), **`allowedCanvasViewIds`**, **`allowedActionIds`**, **`auditNotes`** on deny/fallback.
3. **Tier-2 / inference:** if any LLM or fuzzy logic is introduced, outputs must pass **Zod + policy** from Sub-agent A; customer-facing path must not depend on local Ollama (see `local-agent-governance.mdc`).
4. **Optional:** `SwarmPairingService` only if schematic selection exceeds one module — keep boundaries clean.

**Forbidden:** changing voice lockdown files; adding heavy DB queries on the hottest voice path without governance review.

**Success criteria:** Unit tests: same synthetic input → same resolution; entitlement denial → `auditNotes` + empty or explicit fallback views per policy.

---

## 3) Sub-agent C — Wire resolver into canvas resolve / control API

**Goal:** **Single server authority** — resolver runs on the governed resolve path; clients do not gain a second router.

**Read first:**

- `server/routes/canvasControlRoutes.ts` or equivalent for `canvas.resolve` / `POST /api/canvas-control`
- Where `canvasIntentRouter` and validator run today

**Deliver:**

1. Call **`IntentLoopResolver`** after Tier-0/Tier-1 checks; attach resolution to response or internal context used by hydration **without** exposing client override of `allowedCanvasViewIds`.
2. **No** new business logic in `routes.ts` monolith — extract to services; new routes only as modular router + mount line if needed (`intentLoopRoutes.ts` only if `INTENT_LOOP_GOVERNANCE` requires dedicated endpoints).
3. Preserve **execution plane boundary** — no prompt compilation or heavy domain workflows inline in the hottest path without existing patterns.

**Success criteria:** Integration test or route test: resolve returns resolution envelope; client tests unchanged or updated to expect server authority.

---

## 4) Sub-agent D — Phase C: `SurfaceDerivationService`

**Goal:** Map `IntentLoopResolution` → default **`CanvasViewId`** (+ Command Center slot plans per `COMMAND_CENTER_SURFACE_SPEC_V1.md`).

**Read first:**

- `docs-governance/canonical/COMMAND_CENTER_SURFACE_SPEC_V1.md`
- `docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md` — intent-to-surface derivation
- `server/services/canvasIntentRouter.ts` — **feed** this service; do not fork validator rules client-side

**Deliver:**

1. **`deriveSurfacesFromResolution(resolution: IntentLoopResolution): ...`** returning view id(s), slot fill metadata, or a structured object consumed by existing router/hydration.
2. **Server-only authority** — no duplicate entitlement checks in the client as source of truth.
3. **Fail closed:** if derivation cannot pick a registered surface, use policy from Sub-agent A (safe default / clarification view ids) + `auditNotes`.

**Forbidden:** inventing new views in JSX without VIEW_REGISTRY updates.

**Success criteria:** Unit tests for resolution → derived view; failure cases hit fallback, not random UI.

---

## 5) Sub-agent E — Verification, registry touchpoints, Phase D prep

**Goal:** Close the loop per `INTENT_LOOP_GOVERNANCE_V1.md` § Verification.

**Deliver:**

1. **VIEW_REGISTRY / ACTION_REGISTRY** updates **only if** new surfaces or actions were introduced — if not, confirm “no registry delta” in PR description.
2. **Deterministic tests** for resolver + derivation golden paths.
3. **Skills / YAML:** if any skill changes what users see, add explicit **surface implications** or mark **data-only** in registry/schematic metadata (per `VOICE_FIRST` § Forward path).
4. **Phase D** (hospitality E2E, contract version fail-closed): either **stub tests + TODO** with ticket reference, or one **smallest** E2E if already unblocked — do not block Phase B/C merge on full vertical parity unless requested.

**Success criteria:** `npm run test` (or targeted scripts) green for touched areas; governance checklist in PR body.

---

## Deployment notes

- Use the **Task** tool (or separate chat sessions) with **one sub-agent prompt per run** for clarity.
- If a sub-agent hits ambiguity on **policy** (not code), stop and escalate to human review against `INTENT_LOOP_GOVERNANCE_V1.md` — do not guess entitlements.
- **Phase D** full domain expansion is **parallel track** to B/C only after B/C wire is stable; do not let E2E scope creep block the resolver.
