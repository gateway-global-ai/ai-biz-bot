# onboarding-e2e:new-business-hospitality

**Named test path:** `onboarding-e2e:new-business-hospitality`  
**Runner:** `npm run test:onboarding-e2e-hospitality` (requires `DATABASE_URL` / Doppler)

## Intent

End-to-end proof for a **fresh business**: zero legacy agents, no pre-existing `swarm_role_contract`, no Cloudbeds PMS row unless the test adds it. One provision pass must satisfy deep hospitality projection verification **without** a second “repair” provision.

Boardwalk and similar sites are **legacy fixtures** — not the design center for this test.

## Phase 1 (current)

- Insert a new `site_configs` shell.
- **Simulated** business discovery: in-process `placeTypes` + `businessName` (no Maps / Serp HTTP).
- Minimal **knowledge_artifact** from normalized facts (scraper deferred), with **`artifactMetadata.contract_hash`** and related keys from `shared/onboardingPhase1AdmissionContract.ts` (platform admission fingerprint).
- Re-query artifact and assert title, content, scope, visibility, trust weight, metadata, and **hash matches** `computeContractHash(HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1)`.
- `provisionAgentsForBusiness` once (`hospitality_travel`).
- `verifyHospitalityProjectionDeep` from `server/services/hospitalityProjectionVerify.ts`.

Canonical contract: [`ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md`](../../docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md). Control-plane roadmap: [`CONTROL_PLANE_UNIFICATION_PLAN_V1.md`](../../docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md).

**Negative paths:** `npm run test:onboarding-e2e-hospitality-negative` — wrong industry verify failure, verify without provision.

**CI:** `.github/workflows/onboarding-admission-ci.yml` (Postgres service + migrations + seed + E2E). **Hash-only validator (no DB):** `npm run validate:onboarding-contract-hash`.

**HTTP integration (real `POST /api/intelligence/provision`):** `npm run test:intelligence-provision-contract-http` (requires `DATABASE_URL`) — 422 without/wrong contract for hospitality, 200 with valid id+hash, non-hospitality ungated.

## Phase 2 (future)

- Website URL → scraper skill → merged candidate KB → owner approval → optional reprovision.

## Preconditions

- ≥6 active `industry_agent_templates` for `hospitality_travel` (e.g. `seed-industry-templates`).
- Registry YAML + `validate:agent-classification` remain healthy.

## Success criteria

| Criterion | Check |
|-----------|--------|
| New site, 0 agents before provision | Assert |
| No Cloudbeds `site_pms_integrations` row | Assert |
| `agentsCreated === 6`, `agentsSkipped === 0` | Assert |
| First-run `verifyHospitalityProjectionDeep` OK | FKs, YAML actor/stage, `swarm_role_contract`, `active_deployable` |
| `artifactMetadata.contract_hash` | Equals `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH` / recomputed hash |

The test **deletes** the site afterward (agents, KB artifact, QR routes).
