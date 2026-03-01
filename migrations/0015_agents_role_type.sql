-- Enterprise Guardrails: roleType for deterministic roster and Concierge assignment
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS role_type TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_site_config_role ON agents(site_config_id, role_type);
