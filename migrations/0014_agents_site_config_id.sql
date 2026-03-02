-- Phase 1: Persist site–agent link for Neural Team / agents-for-site
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_site_config_id ON agents(site_config_id);
