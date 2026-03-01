-- Workspace lifecycle columns + indexes for create-or-return safety (unclaimed demo/provisioned only).
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS workspace_state TEXT NOT NULL DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS created_by_type TEXT NULL;

-- Non-unique indexes for lookup performance + future constraints
CREATE INDEX IF NOT EXISTS idx_site_configs_place_id
  ON site_configs(place_id);

CREATE INDEX IF NOT EXISTS idx_site_configs_place_state
  ON site_configs(place_id, workspace_state);

CREATE INDEX IF NOT EXISTS idx_site_configs_owner_place
  ON site_configs(owner_id, place_id);
