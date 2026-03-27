-- Local Agent Plane — extend orchestration_violations CHECK constraint with three new violation types.
-- These types cover the local_agent_plane governance enforcement surface introduced in Phase 0
-- of the Governed Local Agent Plane implementation.

ALTER TABLE orchestration_violations DROP CONSTRAINT IF EXISTS orchestration_violations_type_check;

ALTER TABLE orchestration_violations ADD CONSTRAINT orchestration_violations_type_check
  CHECK (violation_type IN (
    'governance_violation',
    'orchestration_bypass_attempt',
    'aptitude_failure',
    'customer_outcome_threshold_miss',
    'local_model_voice_path_attempt',
    'unauthorized_domain_access',
    'missing_orchestration_run'
  ));
