/**
 * Hospitality Phase 1 platform admission — Node entry (hash recompute + artifact helper).
 * Browser code must import `onboardingPhase1ContractDefinition.ts` only.
 *
 * @see docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md
 */
import { createHash } from "node:crypto";
import {
  HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1,
  HOSPITALITY_PHASE1_CONTRACT_ID,
  ONBOARDING_PHASE1_SCHEMA_VERSION,
  stableStringify,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH as EMBEDDED_CONTRACT_HASH,
} from "./onboardingPhase1ContractDefinition.js";

export {
  HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1,
  HOSPITALITY_PHASE1_CONTRACT_ID,
  HOSPITALITY_PHASE1_EXPECTED_ROLES,
  ONBOARDING_PHASE1_SCHEMA_VERSION,
  stableStringify,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
} from "./onboardingPhase1ContractDefinition.js";

/** SHA-256 hex of stableStringify(definition). */
export function computeContractHash(definition: unknown): string {
  return createHash("sha256").update(stableStringify(definition), "utf8").digest("hex");
}

const _recomputed = computeContractHash(HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1);
if (_recomputed !== EMBEDDED_CONTRACT_HASH) {
  throw new Error(
    `[onboardingPhase1AdmissionContract] Hash drift: recomputed=${_recomputed} embedded=${EMBEDDED_CONTRACT_HASH}. Update onboardingPhase1ContractDefinition.ts or definition object.`,
  );
}

/** Metadata fragment for knowledge_artifacts.artifactMetadata (merge with site-specific fields). */
export function buildHospitalityPhase1ArtifactMetadata(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    contract_hash: EMBEDDED_CONTRACT_HASH,
    contract_id: HOSPITALITY_PHASE1_CONTRACT_ID,
    onboarding_phase1_schema_version: ONBOARDING_PHASE1_SCHEMA_VERSION,
    source: "onboarding_phase1",
    ...extra,
  };
}
