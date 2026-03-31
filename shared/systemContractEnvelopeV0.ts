/**
 * System-wide contract envelope (v0) — control-plane primitive.
 *
 * Onboarding Phase 1 is the first concrete contract with a persisted `contract_hash`.
 * Full Router → Contract Engine → Execution flow is specified in
 * docs-governance/canonical/CONTROL_PLANE_UNIFICATION_PLAN_V1.md
 */

export type SystemContractKindV0 = "onboarding" | "agent" | "route" | "skill";

/** Runtime or persisted view of a versioned, hash-bound contract (v0 shape). */
export interface SystemContractEnvelopeV0 {
  id: string;
  version: string;
  /** SHA-256 hex of canonical serialized `definition` (same algorithm as onboarding module). */
  hash: string;
  type: SystemContractKindV0;
  definition: Record<string, unknown>;
}
