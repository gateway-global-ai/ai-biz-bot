# Onboarding contract — hospitality Phase 1 (v1)

**Platform admission protocol** for hospitality businesses entering the AI OS with a **fresh site** (no legacy swarm, no Cloudbeds PMS row unless the scenario explicitly adds it). This document is law for what Phase 1 guarantees; executable checks live in `tests/onboarding-e2e-new-business-hospitality.ts` and `server/services/hospitalityProjectionVerify.ts`.

## Boardwalk / legacy rule

**Boardwalk Suites** and similar fixtures are **regression and migration targets only**. They are **not** the architectural reference tenant, onboarding authority, or schema design center. **All** Phase 1 onboarding behavior MUST be validated against a **newly created** `site_configs` row as in the fresh-site E2E.

## Required inputs (Phase 1)

- **Site shell:** `site_configs` with business identity (`name`, `slug`, `placeId` or equivalent test id), workspace state appropriate for demo/test.
- **Industry signal:** Google Places–style `placeTypes` array that resolves to `hospitality_travel` via `PLACES_TYPE_TO_INDUSTRY` (e.g. `lodging`, `hotel`).
- **Business name:** used for display and provisioning copy.

## Forbidden pre-state (fresh admission)

Before the first `provisionAgentsForBusiness` pass for that admission scenario:

- **No** `agents` rows for the site.
- **No** `site_pms_integrations` row with `pms_type = cloudbeds` unless the scenario explicitly tests PMS-bound flows (not the default Phase 1 fresh path).

## HTTP provision gate (runtime refusal)

`POST /api/intelligence/provision` validates **before** `runAgentSwarmProvisionOrchestrated` when enforcement is on (default). For `hospitality_travel`, the body must include:

- `admissionContractId` — `onboarding.hospitality.phase1.v1`
- `admissionContractHash` — current `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH` from `shared/onboardingPhase1ContractDefinition.ts`
- `admissionContractVersion` (optional) — e.g. `onboarding_phase1_schema_version` (`1`); stored on violation detail for audit; hash remains the authority for drift. **Version enforcement model** (informational vs must-match) is decided in [execution_contract_engine_v1_expansion.plan.md](../../.cursor/plans/execution_contract_engine_v1_expansion.plan.md); default today is **informational only**.

Validation is routed through `validateExecutionContract` / `recordContractViolation` in `server/services/executionContractEngine.ts`.

Failure: **422** with `code: ADMISSION_CONTRACT_REFUSED`, structured violation logged. Disable only in emergencies: `HOSPITALITY_PROVISION_CONTRACT_ENFORCE=0`.

## HTTP orchestration-runs gate (same admission)

`POST /api/intelligence/orchestration-runs` uses the **same** hospitality Phase 1 admission validator (`executionKind: post_intelligence_orchestration_runs` in `EXECUTION_CONTRACT_KIND_REGISTRY`). Industry signal comes from **`site_configs.placeData.types`** (via `placeTypesFromSiteConfig`), not from the JSON body. When that resolves to hospitality and enforcement is on, the body must include the same `admissionContractId` / `admissionContractHash` (and optional `admissionContractVersion`) as provision. Failure shape matches provision (**422**, `ADMISSION_CONTRACT_REFUSED`). HTTP coverage: `npm run test:intelligence-provision-contract-http`.

## Expected outputs (Phase 1)

- **Industry:** `provisionAgentsForBusiness` detects `industryGroup === "hospitality_travel"`.
- **Swarm:** Six agents created (`agentsCreated === 6`, `agentsSkipped === 0` on a truly fresh site).
- **Projection:** `verifyHospitalityProjectionDeep(siteConfigId)` succeeds — schematic `hospitality_cloudbeds`, six role keys aligned with YAML classification, `swarm_role_contract`, templates, members, `active_deployable`, etc. (see verify service).

## Knowledge foundation (knowledge_artifacts)

Phase 1 may persist a **minimal** business-facts artifact (scraper / enrichment is Phase 2).

### Metadata (required)

| Key | Meaning |
|-----|---------|
| `source` | `onboarding_phase1` |
| `onboarding_phase1_schema_version` | Human schema version; bump when admission KB shape changes |
| `contract_id` | `onboarding.hospitality.phase1.v1` |
| `contract_hash` | SHA-256 (hex) of the canonical serialized **contract definition** (see below) |

### Contract definition (what gets hashed)

The hashed payload is the constant **`HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1`** in [`shared/onboardingPhase1ContractDefinition.ts`](../../shared/onboardingPhase1ContractDefinition.ts) (browser-safe). Node recomputes SHA-256 in [`shared/onboardingPhase1AdmissionContract.ts`](../../shared/onboardingPhase1AdmissionContract.ts) and throws on load if the embedded fingerprint drifts. Serialization is **`stableStringify`**: sorted object keys at every level; arrays keep declaration order (roles listed in sorted order in source).

**Any** change to that object changes `contract_hash` — intentionally, so old artifacts and drift are detectable.

### Current expected hash

Authoritative hex: `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH` in the definition module. CI / local: `npm run validate:onboarding-contract-hash`.

## Phase 2+ (out of scope here)

- URL scraper, merge, owner approval, KB versioning.
- Multi-industry admission contracts (separate `contract_id` + definition).

## Cross-links

- [AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md](./AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)
- [CONTROL_PLANE_UNIFICATION_PLAN_V1.md](./CONTROL_PLANE_UNIFICATION_PLAN_V1.md)
- Testing: [`docs/testing/ONBOARDING_E2E_NEW_BUSINESS_HOSPITALITY.md`](../../docs/testing/ONBOARDING_E2E_NEW_BUSINESS_HOSPITALITY.md)
