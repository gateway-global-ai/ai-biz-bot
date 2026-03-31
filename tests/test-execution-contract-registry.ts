/**
 * Execution contract kind registry + validateExecutionContractById unknown-kind warn path.
 * Run: npx tsx tests/test-execution-contract-registry.ts
 */
import {
  EXECUTION_CONTRACT_KIND_REGISTRY,
  isRegisteredExecutionContractKind,
} from "../server/config/executionContractKindRegistry.js";
import {
  validateExecutionContract,
  validateExecutionContractById,
} from "../server/services/executionContractEngine.js";
import {
  HOSPITALITY_PHASE1_CONTRACT_ID,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
} from "../shared/onboardingPhase1ContractDefinition.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const kinds = Object.keys(EXECUTION_CONTRACT_KIND_REGISTRY);
  assert(kinds.includes("post_intelligence_provision"), "registry has provision kind");
  assert(kinds.includes("post_intelligence_orchestration_runs"), "registry has orchestration-runs kind");

  assert(isRegisteredExecutionContractKind("post_intelligence_provision"), "isRegistered provision");
  assert(!isRegisteredExecutionContractKind("not_a_kind"), "unregistered string");

  const a = validateExecutionContract({
    executionKind: "post_intelligence_provision",
    placeTypes: ["lodging"],
    admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
    admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  });
  assert(a.ok, "provision kind via registry");

  const b = validateExecutionContract({
    executionKind: "post_intelligence_orchestration_runs",
    placeTypes: ["lodging"],
    admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
    admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  });
  assert(b.ok, "orchestration-runs kind same validator");

  const prevWarn = process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND;
  process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND = "1";
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  const u = validateExecutionContractById("totally_fake_kind_xyz", {
    placeTypes: ["lodging"],
  });
  console.warn = origWarn;
  if (prevWarn === undefined) delete process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND;
  else process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND = prevWarn;

  assert(u.ok, "unknown kind allows by policy");
  assert(warnings.some((w) => w.includes("unknown_execution_kind")), "warned for unknown kind");

  process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND = "0";
  let silent = true;
  console.warn = () => {
    silent = false;
  };
  validateExecutionContractById("another_fake", { placeTypes: ["lodging"] });
  console.warn = origWarn;
  delete process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND;
  assert(silent, "EXECUTION_CONTRACT_WARN_UNKNOWN_KIND=0 suppresses warn");

  console.log("[test-execution-contract-registry] PASSED");
}

main();
