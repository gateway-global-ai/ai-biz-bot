/**
 * Single source of truth for orchestration run statuses and violation types.
 * DB CHECK constraints and server logic must align with these arrays.
 *
 * ## Who may set status (control plane)
 * - **in_progress** — Orchestration service on run insert; remains until a terminal transition.
 * - **blocked** — Orchestration service when a governance / aptitude / outcome gate fails (may follow successful mutate).
 * - **failed** — Orchestration service on uncaught provision or system error.
 * - **deferred** — Orchestration service when the run intentionally waits on an external step (e.g. CI) before promote; not used for “success without gate” (use **completed**).
 * - **completed** — Orchestration service only when all required gates for that flow pass.
 */

export const ORCHESTRATION_RUN_STATUS = [
  "in_progress",
  "blocked",
  "failed",
  "deferred",
  "completed",
] as const;

export type OrchestrationRunStatus = (typeof ORCHESTRATION_RUN_STATUS)[number];

export const ORCHESTRATION_VIOLATION_TYPE = [
  "governance_violation",
  "orchestration_bypass_attempt",
  "aptitude_failure",
  "customer_outcome_threshold_miss",
  "local_model_voice_path_attempt",
  "unauthorized_domain_access",
  "missing_orchestration_run",
  "invalid_structured_output",
  "domain_allowlist_violation",
  "workspace_tool_unauthorized",
  "quarantine_direct_execution",
  "quarantine_package_install_bypass",
  "quarantine_unscanned_import",
  "quarantine_routing_import",
  "quarantine_dependency_trust_bypass",
] as const;

export type OrchestrationViolationType = (typeof ORCHESTRATION_VIOLATION_TYPE)[number];

export const ORCHESTRATION_APTITUDE_STATUS = ["deferred", "pass", "fail"] as const;
export type OrchestrationAptitudeStatus = (typeof ORCHESTRATION_APTITUDE_STATUS)[number];
