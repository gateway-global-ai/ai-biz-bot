/**
 * v0 execution-contract kind registry — TS-only (no YAML until governance asks).
 * Maps execution surface → validator key + policy metadata. Not a route table; do not add business branching here.
 *
 * @see .cursor/plans/execution_contract_engine_v1_expansion.plan.md
 */

export const EXECUTION_CONTRACT_VALIDATOR_KEYS = ["hospitality_phase1_admission"] as const;
export type ExecutionContractValidatorKey = (typeof EXECUTION_CONTRACT_VALIDATOR_KEYS)[number];

export type ExecutionContractKind = "post_intelligence_provision" | "post_intelligence_orchestration_runs";

export type ExecutionContractVersionPolicy = "audit_only";

export interface ExecutionContractKindRegistryRow {
  readonly id: ExecutionContractKind;
  readonly routeOrSource: string;
  readonly validatorKey: ExecutionContractValidatorKey;
  readonly versionPolicy: ExecutionContractVersionPolicy;
}

export const EXECUTION_CONTRACT_KIND_REGISTRY: Record<
  ExecutionContractKind,
  ExecutionContractKindRegistryRow
> = {
  post_intelligence_provision: {
    id: "post_intelligence_provision",
    routeOrSource: "POST /api/intelligence/provision",
    validatorKey: "hospitality_phase1_admission",
    versionPolicy: "audit_only",
  },
  post_intelligence_orchestration_runs: {
    id: "post_intelligence_orchestration_runs",
    routeOrSource: "POST /api/intelligence/orchestration-runs",
    validatorKey: "hospitality_phase1_admission",
    versionPolicy: "audit_only",
  },
};

export function isRegisteredExecutionContractKind(id: string): id is ExecutionContractKind {
  return Object.prototype.hasOwnProperty.call(EXECUTION_CONTRACT_KIND_REGISTRY, id);
}

export function getExecutionContractRegistryRow(id: ExecutionContractKind): ExecutionContractKindRegistryRow {
  return EXECUTION_CONTRACT_KIND_REGISTRY[id];
}
