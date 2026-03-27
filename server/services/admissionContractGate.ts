/**
 * Minimal admission contract validation before stateful intelligence work.
 * @see .cursor/plans/router_contract_refusal_minimal.plan.md
 */
import { detectIndustryGroup } from "./agentProvisioning.js";
import {
  HOSPITALITY_PHASE1_CONTRACT_ID,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
} from "../../shared/onboardingPhase1ContractDefinition.js";

export type AdmissionContractValidationResult =
  | { ok: true }
  | { ok: false; code: string; reason: string };

/** When false, hospitality provision does not require admission headers (emergency / legacy). */
export function isHospitalityProvisionAdmissionEnforced(): boolean {
  const v = process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

/**
 * Validates Phase 1 hospitality admission contract for POST /api/intelligence/provision.
 * Non-hospitality industries always pass. When enforcement is off, always pass.
 */
export function validateHospitalityProvisionAdmission(input: {
  placeTypes: string[];
  admissionContractId?: string | undefined;
  admissionContractHash?: string | undefined;
}): AdmissionContractValidationResult {
  if (!isHospitalityProvisionAdmissionEnforced()) {
    return { ok: true };
  }
  if (detectIndustryGroup(input.placeTypes) !== "hospitality_travel") {
    return { ok: true };
  }
  const id = typeof input.admissionContractId === "string" ? input.admissionContractId.trim() : "";
  const hash = typeof input.admissionContractHash === "string" ? input.admissionContractHash.trim() : "";
  if (!id || !hash) {
    return {
      ok: false,
      code: "ADMISSION_CONTRACT_REFUSED",
      reason:
        "hospitality_travel provisioning requires admissionContractId and admissionContractHash matching the platform Phase 1 admission contract",
    };
  }
  if (id !== HOSPITALITY_PHASE1_CONTRACT_ID) {
    return {
      ok: false,
      code: "ADMISSION_CONTRACT_REFUSED",
      reason: `admissionContractId must be "${HOSPITALITY_PHASE1_CONTRACT_ID}"`,
    };
  }
  if (hash !== EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH) {
    return {
      ok: false,
      code: "ADMISSION_CONTRACT_REFUSED",
      reason: "admissionContractHash does not match the current platform admission contract fingerprint",
    };
  }
  return { ok: true };
}
