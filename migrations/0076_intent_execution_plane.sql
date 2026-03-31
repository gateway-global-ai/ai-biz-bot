-- Intent-driven coding swarm foundation.
-- Control-plane persistence for internal engineering intents, scopes, actions, evidence, and review state.

CREATE TABLE IF NOT EXISTS work_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  requested_by text,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_items_site_idx ON work_items(site_config_id);
CREATE INDEX IF NOT EXISTS work_items_status_idx ON work_items(status);

CREATE TABLE IF NOT EXISTS intent_executions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id varchar NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  orchestration_run_id varchar REFERENCES agent_orchestration_runs(id) ON DELETE SET NULL,
  intent_key text NOT NULL,
  intent_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'planning',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intent_executions_work_item_idx ON intent_executions(work_item_id);
CREATE INDEX IF NOT EXISTS intent_executions_site_idx ON intent_executions(site_config_id);
CREATE INDEX IF NOT EXISTS intent_executions_state_idx ON intent_executions(state);

CREATE TABLE IF NOT EXISTS scope_executions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_execution_id varchar NOT NULL REFERENCES intent_executions(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  state text NOT NULL DEFAULT 'queued',
  assigned_agent_role_type text,
  scope_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent_execution_id, scope_key)
);

CREATE INDEX IF NOT EXISTS scope_executions_intent_idx ON scope_executions(intent_execution_id);

CREATE TABLE IF NOT EXISTS skill_bindings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_execution_id varchar NOT NULL REFERENCES scope_executions(id) ON DELETE CASCADE,
  skill_key text NOT NULL,
  skill_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_execution_id, skill_key)
);

CREATE INDEX IF NOT EXISTS skill_bindings_scope_idx ON skill_bindings(scope_execution_id);

CREATE TABLE IF NOT EXISTS execution_packets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_execution_id varchar NOT NULL REFERENCES intent_executions(id) ON DELETE CASCADE,
  scope_execution_id varchar REFERENCES scope_executions(id) ON DELETE SET NULL,
  repo_ref text NOT NULL,
  base_branch text NOT NULL,
  feature_branch text NOT NULL,
  worktree_path text,
  policy_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execution_packets_intent_idx ON execution_packets(intent_execution_id);
CREATE INDEX IF NOT EXISTS execution_packets_scope_idx ON execution_packets(scope_execution_id);

CREATE TABLE IF NOT EXISTS action_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_execution_id varchar NOT NULL REFERENCES scope_executions(id) ON DELETE CASCADE,
  skill_binding_id varchar REFERENCES skill_bindings(id) ON DELETE SET NULL,
  orchestration_run_id varchar REFERENCES agent_orchestration_runs(id) ON DELETE SET NULL,
  agent_id varchar REFERENCES agents(id) ON DELETE SET NULL,
  action_key text NOT NULL,
  state text NOT NULL DEFAULT 'queued',
  action_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_runs_scope_idx ON action_runs(scope_execution_id);
CREATE INDEX IF NOT EXISTS action_runs_state_idx ON action_runs(state);
CREATE INDEX IF NOT EXISTS action_runs_orchestration_idx ON action_runs(orchestration_run_id);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  action_run_id varchar NOT NULL REFERENCES action_runs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  uri text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_artifacts_action_idx ON evidence_artifacts(action_run_id);

CREATE TABLE IF NOT EXISTS outcome_packets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_execution_id varchar NOT NULL UNIQUE REFERENCES intent_executions(id) ON DELETE CASCADE,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  files_touched jsonb NOT NULL DEFAULT '[]'::jsonb,
  domains_touched jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks_run jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_ready boolean NOT NULL DEFAULT false,
  required_gates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outcome_packets_intent_idx ON outcome_packets(intent_execution_id);
CREATE INDEX IF NOT EXISTS outcome_packets_review_ready_idx ON outcome_packets(review_ready);

CREATE TABLE IF NOT EXISTS review_gates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_packet_id varchar NOT NULL REFERENCES outcome_packets(id) ON DELETE CASCADE,
  gate_key text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outcome_packet_id, gate_key)
);

CREATE INDEX IF NOT EXISTS review_gates_outcome_idx ON review_gates(outcome_packet_id);

CREATE TABLE IF NOT EXISTS pull_request_links (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_execution_id varchar NOT NULL REFERENCES intent_executions(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'github',
  repo text NOT NULL,
  pr_number integer,
  pr_url text,
  branch_name text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pull_request_links_intent_idx ON pull_request_links(intent_execution_id);
