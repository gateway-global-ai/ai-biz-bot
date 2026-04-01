-- Coding Orchestrator Engine v1 — extend violation type CHECK constraint.
-- Adds: invalid_structured_output (was conflated with missing_orchestration_run)
--        domain_allowlist_violation (positive path enforcement)
--        workspace_tool_unauthorized (already existed in code but not in constraint)

ALTER TABLE orchestration_violations DROP CONSTRAINT IF EXISTS orchestration_violations_type_check;

ALTER TABLE orchestration_violations ADD CONSTRAINT orchestration_violations_type_check
  CHECK (violation_type IN (
    'governance_violation',
    'orchestration_bypass_attempt',
    'aptitude_failure',
    'customer_outcome_threshold_miss',
    'local_model_voice_path_attempt',
    'unauthorized_domain_access',
    'missing_orchestration_run',
    'invalid_structured_output',
    'domain_allowlist_violation',
    'workspace_tool_unauthorized'
  ));
