---
name: Execution contract engine v1 expansion
overview: Register execution kinds in a small metadata map; add one second governed kind; phase unknown-kind policy (allow → warn → deny); decide version vs hash authority; optional refusal analytics hooks.
todos:
  - id: kind-registry-v0
    content: In-code EXECUTION_CONTRACT_KIND_REGISTRY (or YAML under registry-yaml/ if governance prefers) — rows executionKindId, routeOrSource, validatorKey, expectedContractId, expectedHashRef, versionPolicy, enforcementMode; v0 can be TS const satisfying a Zod schema
  - id: second-execution-kind
    content: Pick and wire one second route (see candidates below) through validateExecutionContract + recordContractViolation; add HTTP or extend existing HTTP test
  - id: unknown-kind-policy
    content: Phase 1 keep current behavior; Phase 2 log structured warn for unregistered kind at protected call sites; Phase 3 default-deny for routes that opt into strict registry (env or per-route flag)
  - id: version-policy-decision
    content: Document chosen model — informational only | must match ONBOARDING_PHASE1_SCHEMA_VERSION | derived from contract id — and implement minimal check if not informational-only
  - id: refusal-analytics-hook
    content: Optional single log line or metrics tag (executionKind, code, routeOrSource) after recordContractViolation for future aggregation — no full BI in this slice
isProject: false
---

# Execution contract engine v1 expansion

## Status

**Implemented (v0):** `server/config/executionContractKindRegistry.ts`, `placeTypesFromSiteConfig`, registry dispatch in `executionContractEngine.ts`, second kind on `POST /api/intelligence/orchestration-runs`, `validateExecutionContractById` unknown-kind warn (`EXECUTION_CONTRACT_WARN_UNKNOWN_KIND`), tests `test-execution-contract-registry.ts` + extended `test-intelligence-provision-contract-http.ts`. **Still open:** Phase 3 opt-in default-deny for unregistered kinds; richer refusal analytics hook; version policy beyond informational.

**Follows:** [router_contract_refusal_minimal.plan.md](./router_contract_refusal_minimal.plan.md) (implemented).  
**Baseline code:** `server/services/executionContractEngine.ts`, `admissionContractGate.ts`, `POST /api/intelligence/provision`, `npm run test:intelligence-provision-contract-http`.

## Why this slice

The minimal precedent is complete: one validation entrypoint, one refusal writer, one HTTP proof. This expansion **proves the engine is not a hospitality wrapper** by adding a **second execution kind** and **kind registration metadata**, without a giant rewrite.

## 1. Execution kind registration (v0)

Introduce a **single registry object** (TypeScript first; promote to `registry-yaml/` only if governance review requires it for the same PR).

Suggested row shape (conceptual):

| Field | Purpose |
|--------|--------|
| `executionKindId` | Stable string, e.g. `post_intelligence_provision` |
| `routeOrSource` | Human/doc anchor, e.g. `POST /api/intelligence/provision` |
| `validatorKey` | Maps to a small internal validator registry (`hospitality_phase1_admission`, …) |
| `expectedContractId` | Optional; or resolved via shared module import |
| `expectedHashRef` | Pointer to constant (not duplicated string in YAML for v0) |
| `versionPolicy` | `audit_only` \| `must_match_schema` \| `derived_from_contract` (see §4) |
| `enforcementMode` | `on` \| `env_gated` (align with `HOSPITALITY_PROVISION_CONTRACT_ENFORCE` pattern) |

`validateExecutionContract` should **dispatch from registry + validatorKey** instead of a growing `switch` (or keep switch as thin delegate to registry lookup).

## 2. Second governed execution kind (pick one)

**Goal:** Same refusal mechanism, **distinct** validation path or context.

**Candidates (choose one in implementation):**

| Candidate | Route | Notes |
|-----------|--------|--------|
| **A (recommended)** | `POST /api/intelligence/orchestration-runs` | Sibling under intelligence; high governance value (starts orchestration before agent create). May require loading `site_configs` / `placeData` to know if hospitality — share helper with provision or gate only when industry is hospitality. |
| B | `POST /api/workspace-agent/provision` | Separate provision surface; clarify contract overlap with intelligence provision. |
| C | High-risk `skillDispatchRoutes` skillId | Atomic skill gate; good if skill list is small and semantics clear. |

**Deliverable:** Route calls `validateExecutionContract` + `recordContractViolation` **before** stateful work; test coverage (extend HTTP test or add focused test).

## 3. Unknown / unregistered execution kinds — phased policy

**Problem:** Permissive `unknown → { ok: true }` is safe for bootstrap but **dangerous** once multiple kinds exist.

**Phased migration:**

1. **Current:** Unregistered kinds pass (only one kind is typable today).
2. **Next:** Any call path that passes an **explicit** kind string through a **widened** runtime type: if not in registry → **`console.warn` / structured log** with `executionKind`, `routeOrSource`, `severity: contract_engine_unknown_kind`** (no refuse yet).
3. **Target:** Routes that opt into **strict mode** (flag or env) → **refuse** unregistered kinds with deterministic code, e.g. `EXECUTION_KIND_UNREGISTERED`.

Document the phase in `executionContractEngine.ts` and flip phase 2 in the same PR as the second kind if feasible.

## 4. `admissionContractVersion` — decide the model

Today: **audited only**; **id + hash** are authoritative.

Choose one documented model:

- **A — Informational only** — version in violation detail and logs; never blocks.
- **B — Must match** — offered version must equal `ONBOARDING_PHASE1_SCHEMA_VERSION` when contract id is Phase 1 hospitality; mismatch → refuse with new code (e.g. `ADMISSION_CONTRACT_VERSION_REFUSED`).
- **C — Derived** — do not accept client version; server derives display version from contract module only.

Record the decision in `ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md` and implement **B or C** only if product agrees; default stay **A** for this slice.

## 5. Refusal analytics (optional, small)

Because `recordContractViolation` is centralized, add a **single structured log or metric tag** after persist:

- `executionKind`, `code`, `routeOrSource`, `contractId` (if any)

No dashboards in this slice — only a hook for future aggregation / BigQuery / admin metrics.

## Out of scope

- Full DB-backed contract store
- UI for contract management
- Deny-by-default on all routes globally
- Replacing canvas or voice validators

## Success criteria

- [ ] Registry object exists and dispatches at least **two** execution kinds.
- [ ] Unknown-kind policy documented; phase 2 (warn) implemented when runtime kind string is used.
- [ ] Version policy documented; enforcement only if model B chosen.
- [ ] Optional analytics hook behind env flag if noise is a concern (`EXECUTION_CONTRACT_VIOLATION_LOG_ANALYTICS=1`).

## References

- [CONTROL_PLANE_UNIFICATION_PLAN_V1.md](../../docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md)
- [ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md](../../docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md)
