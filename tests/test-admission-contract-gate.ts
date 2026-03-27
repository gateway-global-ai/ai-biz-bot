/**
 * Admission contract gate for hospitality provision (pure logic + env toggle).
 * Run: npx tsx tests/test-admission-contract-gate.ts
 */
import {
  validateHospitalityProvisionAdmission,
  isHospitalityProvisionAdmissionEnforced,
} from "../server/services/admissionContractGate.js";
import { validateExecutionContract } from "../server/services/executionContractEngine.js";
import {
  HOSPITALITY_PHASE1_CONTRACT_ID,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
} from "../shared/onboardingPhase1ContractDefinition.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const prev = process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE;

  process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = "1";
  assert(isHospitalityProvisionAdmissionEnforced(), "enforce should be on when unset or 1");

  // Non-hospitality: always ok when enforced
  let r = validateHospitalityProvisionAdmission({
    placeTypes: ["lawyer"],
  });
  assert(r.ok, "lawyer path should not require admission contract");

  // Hospitality: missing contract → refused
  r = validateHospitalityProvisionAdmission({
    placeTypes: ["lodging"],
  });
  assert(!r.ok && r.code === "ADMISSION_CONTRACT_REFUSED", "lodging without contract must refuse");

  // Hospitality: wrong hash → refused
  r = validateHospitalityProvisionAdmission({
    placeTypes: ["hotel"],
    admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
    admissionContractHash: "0".repeat(64),
  });
  assert(!r.ok && r.code === "ADMISSION_CONTRACT_REFUSED", "wrong hash must refuse");

  // Hospitality: valid → ok
  r = validateHospitalityProvisionAdmission({
    placeTypes: ["lodging"],
    admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
    admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  });
  assert(r.ok, "valid id+hash must pass");

  // Enforcement off → always ok even for hospitality without contract
  process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = "0";
  assert(!isHospitalityProvisionAdmissionEnforced(), "enforce off");
  r = validateHospitalityProvisionAdmission({ placeTypes: ["lodging"] });
  assert(r.ok, "with enforcement off, lodging without contract passes");

  process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = "1";
  const eng = validateExecutionContract({
    executionKind: "post_intelligence_provision",
    placeTypes: ["lodging"],
    admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
    admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
    admissionContractVersion: "1",
  });
  assert(eng.ok, "execution engine delegates hospitality admission");

  if (prev === undefined) delete process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE;
  else process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = prev;

  console.log("[test-admission-contract-gate] PASSED");
}

main();
