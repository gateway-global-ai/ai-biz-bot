-- Closed set for agent_orchestration_runs.status + gate columns + orchestration_violations

ALTER TABLE agent_orchestration_runs DROP CONSTRAINT IF EXISTS agent_orchestration_runs_status_check;
ALTER TABLE agent_orchestration_runs ADD CONSTRAINT agent_orchestration_runs_status_check
  CHECK (status IN ('in_progress', 'blocked', 'failed', 'deferred', 'completed'));

ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS aptitude_status text NOT NULL DEFAULT 'deferred';
ALTER TABLE agent_orchestration_runs ADD CONSTRAINT agent_orchestration_runs_aptitude_check
  CHECK (aptitude_status IN ('deferred', 'pass', 'fail'));

ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS required_for_deploy boolean NOT NULL DEFAULT false;

ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS clarity_score integer;
ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS configuration_completeness integer;
ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS fallback_defined boolean;
ALTER TABLE agent_orchestration_runs ADD COLUMN IF NOT EXISTS first_value_path_present boolean;

CREATE TABLE IF NOT EXISTS orchestration_violations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orchestration_run_id varchar REFERENCES agent_orchestration_runs(id) ON DELETE SET NULL,
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  severity text NOT NULL,
  violation_type text NOT NULL,
  route_or_source text,
  actor_hint text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT orchestration_violations_type_check CHECK (violation_type IN (
    'governance_violation',
    'orchestration_bypass_attempt',
    'aptitude_failure',
    'customer_outcome_threshold_miss'
  ))
);

CREATE INDEX IF NOT EXISTS orchestration_violations_run_idx ON orchestration_violations(orchestration_run_id);
CREATE INDEX IF NOT EXISTS orchestration_violations_site_idx ON orchestration_violations(site_config_id);
CREATE INDEX IF NOT EXISTS orchestration_violations_created_idx ON orchestration_violations(created_at);
