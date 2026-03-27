-- Control-plane memory for agent swarm provisioning (SOVEREIGN_OS_V1 orchestration runs)

CREATE TABLE IF NOT EXISTS agent_orchestration_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  agent_id varchar REFERENCES agents(id) ON DELETE SET NULL,
  current_state text NOT NULL DEFAULT 'init',
  step text NOT NULL DEFAULT 'orchestrator',
  status text NOT NULL DEFAULT 'in_progress',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_orchestration_runs_site_idx ON agent_orchestration_runs(site_config_id);
CREATE INDEX IF NOT EXISTS agent_orchestration_runs_status_idx ON agent_orchestration_runs(status);
