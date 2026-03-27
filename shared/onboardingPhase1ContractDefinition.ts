/**
 * Browser-safe hospitality Phase 1 admission contract — definition + expected fingerprint.
 * Server recomputes SHA-256 on load in `onboardingPhase1AdmissionContract.ts` and throws if drift.
 *
 * @see docs-governance/canonical/ONBOARDING_CONTRACT_HOSPITALITY_PHASE1_V1.md
 */

/** Logical id for this admission contract. */
export const HOSPITALITY_PHASE1_CONTRACT_ID = "onboarding.hospitality.phase1.v1";

/** Schema version stored in artifact metadata. */
export const ONBOARDING_PHASE1_SCHEMA_VERSION = "1";

/**
 * Deterministic JSON: objects have sorted keys; arrays preserve declaration order.
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((x) => stableStringify(x)).join(",")}]`;
  }
  if (t !== "object") {
    return JSON.stringify(String(value));
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Roles required for hospitality_cloudbeds admission (alphabetical — hash-stable). */
export const HOSPITALITY_PHASE1_EXPECTED_ROLES = [
  "billing_analyst",
  "booking_coordinator",
  "concierge",
  "gatekeeper",
  "lead_qualifier",
  "retention_empath",
] as const;

/** Versioned payload that is hashed. Any change here requires updating EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH. */
export const HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1 = {
  admission: "platform_phase1_hospitality",
  contract_id: HOSPITALITY_PHASE1_CONTRACT_ID,
  expected_industry_group: "hospitality_travel",
  expected_role_count: 6,
  expected_roles: [...HOSPITALITY_PHASE1_EXPECTED_ROLES],
  expected_swarm_schematic_key: "hospitality_cloudbeds",
  place_types_semantics: "google_places_types_for_industry_detection",
  schema_version: ONBOARDING_PHASE1_SCHEMA_VERSION,
} as const;

/**
 * SHA-256 hex of stableStringify(HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1).
 * Must stay aligned with server `computeContractHash` — verified at server module load + validate script.
 */
export const EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH =
  "6dbb47f48fe2221a6e7e784f169bc4454dee8be06de54d7037ff056ab81487b6";
