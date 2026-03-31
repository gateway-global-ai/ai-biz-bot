#!/usr/bin/env npx tsx
/**
 * Prints hospitality Phase 1 admission contract_hash for CI logs and asserts determinism.
 * Run: npx tsx scripts/validate-onboarding-contract-hash.ts
 */
import {
  computeContractHash,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1,
} from "../shared/onboardingPhase1AdmissionContract.js";

const recomputed = computeContractHash(HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1);
if (recomputed !== EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH) {
  console.error(
    "[validate-onboarding-contract-hash] Mismatch: module constant vs recompute. This should never happen.",
  );
  process.exit(1);
}
console.log("[validate-onboarding-contract-hash] onboarding.hospitality.phase1 contract_hash:", recomputed);
process.exit(0);
