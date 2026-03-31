/**
 * Reusable execution-time contract validation + governed refusal recording.
 * Dispatches via `EXECUTION_CONTRACT_KIND_REGISTRY` — add kinds there, not ad hoc switches in routes.
 *
 * Unknown-kind policy (see .cursor/plans/execution_contract_engine_v1_expansion.plan.md):
 * 1. Typed `validateExecutionContract` — kind must be registered (compiler-enforced).
 * 2. `validateExecutionContractById` — unregistered runtime strings: structured warn (unless EXECUTION_CONTRACT_WARN_UNKNOWN_KIND=0), then allow.
 * 3. Future: strict deny for opt-in routes only.
 *
 * @see docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md
 * @see docs-governance/canonical/EXECUTION_MUTATION_GATE_SPEC_V1.md (tool/integration envelopes — `executeContract` in executionMutationGate.ts)
 */
import { persistOrchestrationViolation } from "./agentOrchestration.js";
import {
  validateHospitalityProvisionAdmission,
  isHospitalityProvisionAdmissionEnforced,
  type AdmissionContractValidationResult,
} from "./admissionContractGate.js";
import {
  getExecutionContractRegistryRow,
  isRegisteredExecutionContractKind,
  type ExecutionContractKind,
  type ExecutionContractValidatorKey,
} from "../config/executionContractKindRegistry.js";

export type { ExecutionContractKind } from "../config/executionContractKindRegistry.js";

export type ValidateExecutionContractInput = {
  executionKind: ExecutionContractKind;
  placeTypes: string[];
  admissionContractId?: string | undefined;
  admissionContractHash?: string | undefined;
  admissionContractVersion?: string | undefined;
};

export type ExecutionContractValidationResult = AdmissionContractValidationResult;

function runRegistryValidator(
  validatorKey: ExecutionContractValidatorKey,
  input: Omit<ValidateExecutionContractInput, "executionKind">,
): ExecutionContractValidationResult {
  switch (validatorKey) {
    case "hospitality_phase1_admission":
      return validateHospitalityProvisionAdmission({
        placeTypes: input.placeTypes,
        admissionContractId: input.admissionContractId,
        admissionContractHash: input.admissionContractHash,
      });
    default: {
      const _exhaustive: never = validatorKey;
      return _exhaustive;
    }
  }
}

export function validateExecutionContract(
  input: ValidateExecutionContractInput,
): ExecutionContractValidationResult {
  const row = getExecutionContractRegistryRow(input.executionKind);
  return runRegistryValidator(row.validatorKey, {
    placeTypes: input.placeTypes,
    admissionContractId: input.admissionContractId,
    admissionContractHash: input.admissionContractHash,
    admissionContractVersion: input.admissionContractVersion,
  });
}

/**
 * When the execution kind is a runtime string (e.g. future plugin boundary). Unregistered kinds: warn + allow.
 */
export function validateExecutionContractById(
  executionKindId: string,
  payload: Omit<ValidateExecutionContractInput, "executionKind">,
): ExecutionContractValidationResult {
  if (!isRegisteredExecutionContractKind(executionKindId)) {
    maybeWarnUnknownExecutionKind(executionKindId);
    return { ok: true };
  }
  return validateExecutionContract({
    executionKind: executionKindId,
    ...payload,
  });
}

function maybeWarnUnknownExecutionKind(executionKindId: string): void {
  if (process.env.EXECUTION_CONTRACT_WARN_UNKNOWN_KIND?.trim() === "0") {
    return;
  }
  console.warn(
    "[executionContract] unknown_execution_kind",
    JSON.stringify({
      evt: "contract_engine_unknown_kind",
      executionKindId,
    }),
  );
}

export type RecordContractViolationInput = {
  siteConfigId: string;
  routeOrSource: string;
  actorHint: string | undefined;
  validation: Extract<ExecutionContractValidationResult, { ok: false }>;
  extraDetail?: Record<string, unknown>;
};

export async function recordContractViolation(input: RecordContractViolationInput): Promise<void> {
  await persistOrchestrationViolation({
    violationType: "governance_violation",
    severity: "medium",
    siteConfigId: input.siteConfigId,
    routeOrSource: input.routeOrSource,
    actorHint: input.actorHint,
    detail: {
      reason: "execution_contract_refused",
      code: input.validation.code,
      contractReason: input.validation.reason,
      enforcementEnabled: isHospitalityProvisionAdmissionEnforced(),
      orchestrationRunId: null,
      ...input.extraDetail,
    },
  });
}
