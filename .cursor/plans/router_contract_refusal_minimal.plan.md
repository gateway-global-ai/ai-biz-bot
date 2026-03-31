---
name: Router contract refusal (minimal)
overview: One production path that validates a versioned admission contract before stateful work; structured refusal on failure; no generic registry or UI-wide policy in this slice.
status: implemented (2026-03-27) — admissionContractGate + POST /api/intelligence/provision + AgentBuilder payload + test:admission-contract-gate
todos:
  - id: contract-engine-skeleton
    content: Add minimal validateContract (or validateAdmissionContract) module — input contractId + expectedHash + context; return { ok } | { ok false, code, reason }; no framework
  - id: registry-lookup-v0
    content: Single in-code registry map for onboarding.hospitality.phase1.v1 → { version, expectedHash } from shared/onboardingPhase1AdmissionContract.ts (import constants; thin wrapper only)
  - id: wire-provision-route
    content: POST /api/intelligence/provision — after assertSiteAccessForSession, before runAgentSwarmProvisionOrchestrated — resolve industry from placeTypes; if hospitality_travel, validate admission contract from body; refuse with deterministic JSON + log
  - id: tests-success-refusal
    content: Two tests — valid id+hash for hospitality → provision proceeds; wrong/missing hash → 4xx + code, no orchestration run / no agent mutation (or assert no new agents if using transaction test pattern)
  - id: doc-crosslink
    content: One paragraph in CONTROL_PLANE_UNIFICATION_PLAN_V1 or ONBOARDING_CONTRACT pointing at this route as first enforcement site; optional permit-check script entry for route if required by repo rules
isProject: false
---

# Router → contract refusal (minimal execution plan)

## Objective

Establish **one irreversible precedent**: real runtime work does not proceed unless a **versioned contract** validates successfully **before** expensive or stateful execution.

```
resolve (route + auth) → validate contract → execute OR refuse
```

Not: resolve → execute partially → validate.

## Canonical context

- Admission definition + hash: [`shared/onboardingPhase1AdmissionContract.ts`](../../shared/onboardingPhase1AdmissionContract.ts)
- Doctrine: [`docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md`](../../docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md), [`docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md`](../../docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md)

## First implementation target (recommended)

**`POST /api/intelligence/provision`** in [`server/routes/intelligenceRoutes.ts`](../../server/routes/intelligenceRoutes.ts)

- **Why:** Real system work (`runAgentSwarmProvisionOrchestrated` → DB agents, orchestration runs) with clear before/after boundary. Already has `assertSiteAccessForSession` and structured denial patterns (`SITE_ACCESS_DENIED`, `persistOrchestrationViolation`).
- **Why not UI / voice / canvas first:** Refusal semantics must be unambiguous; avoid multi-branch chat and lockdown files.
- **Where to insert:** Immediately after site access succeeds (today ~L131), **before** `runAgentSwarmProvisionOrchestrated` (~L133).

### Hospitality-only gate (v1)

Use `detectIndustryGroup(placeTypes)` (same logic as provisioning — import from `agentProvisioning` or share a one-liner) **only when** the result is `hospitality_travel`:

- Require request body fields (names TBD in implementation; suggest):
  - `admissionContractId` — must equal `HOSPITALITY_PHASE1_CONTRACT_ID`
  - `admissionContractHash` — must equal `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH`
- Non-hospitality industries: **no change** in this slice (keeps blast radius small).

**Back-compat note:** Any caller that provisions hospitality via this route must send the new fields once enforcement is on. Mitigations to choose at implementation time (pick one, document in route comment):

- Short **log-only** deploy (validate + log mismatch, still proceed) then flip to hard refuse; or
- Env-gated enforcement (e.g. `HOSPITALITY_PROVISION_CONTRACT_ENFORCE=1`) until clients updated.

Do not leave silent bypass indefinitely.

## Minimal contract engine (interface)

Single small function, e.g. in `server/services/admissionContractGate.ts` (name TBD):

```ts
validateContract(input: {
  contractId: string;
  offeredHash: string;
  context: Record<string, unknown>; // e.g. { route, siteConfigId, industryGroup }
}): { ok: true } | { ok: false; code: string; reason: string };
```

Internally: lookup **registry v0** (in-memory map keyed by `contractId` → `{ expectedHash, schemaVersion }` sourced from shared module). Compare `offeredHash === expectedHash` (and optionally `contractId` match).

No Zod graph, no plugin system, no async registry fetch in this slice unless trivial.

## Registry lookup v0

- **One path:** static map populated from `HOSPITALITY_PHASE1_CONTRACT_ID` + `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH` + `ONBOARDING_PHASE1_SCHEMA_VERSION`.
- **Explicit non-goal:** YAML registry files, DB-backed contract store, multi-contract composition.

## Refusal behavior (failure)

- **Do not** call `runAgentSwarmProvisionOrchestrated`.
- HTTP **409** or **422** (pick one; document) with JSON body, e.g.:
  - `error` — human-readable
  - `code` — machine constant, e.g. `ADMISSION_CONTRACT_REFUSED`
  - `contractId` / `expectedSchemaVersion` (optional; avoid leaking unnecessary internals)
- **Log:** structured line or object: `route`, `siteConfigId`, `code`, `reason`, `offeredHash` (truncated ok), `contractId`.
- Implemented: `recordContractViolation` → `detail.reason: execution_contract_refused` (+ `contractReason`, `code`).

## Success behavior

- Validation passes → call `runAgentSwarmProvisionOrchestrated` **unchanged**; response shape unchanged.

## Tests (required)

1. **Happy:** Hospitality `placeTypes`, valid `admissionContractId` + `admissionContractHash` → provision succeeds (existing assertions or new ones on agent count).
2. **Refusal:** Same site prep, wrong hash or wrong id → **no** successful provision outcome; response has deterministic `code`; assert **no** new agents created for that site (or orchestration not started — choose strongest observable).

Prefer extending existing test harness (integration test with DB + mocked auth if needed) over HTTP-only if auth makes E2E heavy.

## Explicitly out of scope (later)

- Generic route/view/skill registry migration
- Full agent contract enforcement on every tool call
- UI-wide policy
- Scraper / KB merge gating
- Multi-contract AND/OR composition
- Replacing `canvasDirectiveValidator` or voice paths

## Success criteria for this plan

- One route demonstrates **validate-before-execute** with a **real refusal** that skips downstream work.
- Operators can detect drift: wrong hash always fails the same way with audit log + stable `code`.
- [`CONTROL_PLANE_UNIFICATION_PLAN_V1.md`](../../docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md) can cite this route as **precedent #1** for replication to other intelligence/orchestration entrypoints.
