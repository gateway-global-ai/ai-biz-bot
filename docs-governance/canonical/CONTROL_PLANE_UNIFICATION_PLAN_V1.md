# Control plane unification plan (v1)

**Status:** Design / sequencing document (peer synthesis + Gateway OS alignment).  
**Related:** [ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md](./ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md) (first executable admission contract), [REGISTRY_AUTHORITY_CHARTER.md](./REGISTRY_AUTHORITY_CHARTER.md), [GOVERNANCE_EXECUTION_PLAN_V1.md](./GOVERNANCE_EXECUTION_PLAN_V1.md).  
**Discovery inputs:** `user_uploads/governane_plan3_26/` (cartography, implicit capabilities, breach audit, registry migration planner).  
**Next execution (precedent #1 — validate before provision):** [`.cursor/plans/router_contract_refusal_minimal.plan.md`](../../.cursor/plans/router_contract_refusal_minimal.plan.md) (implemented).  
**Next execution (precedent #2 — engine expansion):** [`.cursor/plans/execution_contract_engine_v1_expansion.plan.md`](../../.cursor/plans/execution_contract_engine_v1_expansion.plan.md)

## Doctrine (three threads → one system)

| Thread | Role |
|--------|------|
| Onboarding Phase 1 (hospitality) | **Platform admission protocol** — valid business, forbidden pre-state, required outputs |
| Registry rollout | **Single source of truth** — same rows drive docs, validators, runtime allowlists |
| Router + contract engine | **Runtime enforcement** — no heavy execution without conforming to a versioned, hashed contract |

**Kernel rule (target end state):** nothing executes unless it conforms to a **versioned contract** with a **deterministic fingerprint** (`contract_hash`), where the definition is authored once and consumed uniformly.

This is larger than onboarding: onboarding is the **first** persisted contract + hash in production metadata; the same pattern extends to agents, routes, skills, and tools over time.

## Phases (precision sequencing)

### Phase 1 — Contract as first-class object (in progress)

- Introduce shared types: `shared/systemContractEnvelopeV0.ts` (envelope v0).
- Persist `contract_hash` + `onboarding_phase1_schema_version` on Phase 1 knowledge artifacts; hash covers `HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1` in `shared/onboardingPhase1AdmissionContract.ts`.
- E2E and optional CI assert stored hash matches `computeContractHash(definition)`.

### Phase 2 — Contract engine (enforcement layer)

- **Precedent:** `server/services/executionContractEngine.ts` (`validateExecutionContract`, `recordContractViolation`) + hospitality rules in `admissionContractGate.ts` + `POST /api/intelligence/provision` (see [router_contract_refusal_minimal.plan.md](../../.cursor/plans/router_contract_refusal_minimal.plan.md)). HTTP coverage: `npm run test:intelligence-provision-contract-http`. **Expansion:** [execution_contract_engine_v1_expansion.plan.md](../../.cursor/plans/execution_contract_engine_v1_expansion.plan.md) (second kind, kind registry, unknown-kind phases, version policy).
- API shape (future): evaluate definition + context → pass | refuse | escalate with typed reasons.
- Responsibilities: schema validation, hash verification, version rules, pre/post conditions where applicable.
- **Non-goals initially:** replacing `canvasDirectiveValidator` or `geminiVoice` in one step; integrate at orchestration and admission boundaries first.

### Phase 3 — Router integration

- Target pattern: **resolve intent/route → load contract → validate hash/version → preconditions → execute → postconditions** (where “router” includes HTTP routers, skill dispatch, and orchestration entrypoints — not only canvas).
- Align with breach-audit themes: reduce prompt-as-policy and duplicate route tables by making contracts and registries authoritative **before** execution.

### Phase 4 — Registry alignment

- Execute the migration planner: collapse duplicate tables (`REGISTERED_VIEW_IDS` vs `CanvasViewId`, `TIER1_RULES`, skill YAML vs `z.enum`, menus vs views.yaml).
- Each registry row that gates execution should be able to reference **contract id + version + hash** when the row is itself versioned policy.

### Phase 5 — Extend `contract_hash` system-wide

- Agents, routes, skills, tools: versioned definitions + hashes stored or derived at publish time; migrations key off stable fingerprints.

## Critical warnings (from breach audit)

- UI mutation and tool-metadata bypasses must not be “fixed” only by a new router — the **contract engine** must sit on execution paths that matter.
- Voice and Twilio paths remain **lockdown** domains: any change there is an explicit governance task, not an implicit part of this rollout.

## Next implementation slice

After Phase 1 admission + hash is merged: design a **narrow** contract-engine MVP (single orchestration or intelligence entrypoint + one refusal path), then expand. Do not boil the ocean in one PR.
