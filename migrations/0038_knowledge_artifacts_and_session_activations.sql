-- Knowledge artifacts: first-class docs with scope, visibility, and agent_access_key for retrieval.
-- Session activations: which document keys are active per session (for in-chat overlay).
-- Idempotent.

CREATE TABLE IF NOT EXISTS knowledge_artifacts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'business' CHECK (scope IN ('platform', 'franchise', 'business')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  agent_access_key varchar NOT NULL UNIQUE,
  title text NOT NULL,
  content text,
  source_path text,
  group_level text,
  owner_id varchar REFERENCES customer_accounts(id) ON DELETE SET NULL,
  reseller_id varchar REFERENCES resellers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_artifacts_site_config_id ON knowledge_artifacts(site_config_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_artifacts_scope_visibility ON knowledge_artifacts(scope, visibility);
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_artifacts_agent_access_key ON knowledge_artifacts(agent_access_key);

COMMENT ON TABLE knowledge_artifacts IS 'KB documents with RBAC scope and visibility; agent_access_key used for retrieval and session activation.';

CREATE TABLE IF NOT EXISTS artifact_session_activations (
  id serial PRIMARY KEY,
  session_id varchar NOT NULL,
  agent_access_key varchar NOT NULL,
  site_config_id varchar REFERENCES site_configs(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, agent_access_key)
);

CREATE INDEX IF NOT EXISTS idx_artifact_session_activations_session_id ON artifact_session_activations(session_id);
CREATE INDEX IF NOT EXISTS idx_artifact_session_activations_site_config_id ON artifact_session_activations(site_config_id);

COMMENT ON TABLE artifact_session_activations IS 'Tracks which KB artifact keys are active for a given chat/session.';
