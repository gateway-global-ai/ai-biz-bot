-- Installation API keys for remote OS / ISV access to POST /api/v1/verification/*
-- Key prefix is unique for lookup; full key is hashed (SHA-256 hex).

CREATE TABLE IF NOT EXISTS verification_installation_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Installation',
  key_prefix varchar(24) NOT NULL,
  secret_hash text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '["verification.guest"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS verification_installation_api_keys_prefix_uidx
  ON verification_installation_api_keys (key_prefix)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS verification_installation_api_keys_site_idx
  ON verification_installation_api_keys (site_config_id);
