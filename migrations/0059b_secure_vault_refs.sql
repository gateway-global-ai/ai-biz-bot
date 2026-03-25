-- Zero-LLM secure vault handoff: opaque references only (no raw PAN/CVV/full API secrets).

CREATE TABLE IF NOT EXISTS secure_vault_refs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  category text NOT NULL,
  opaque_reference text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  attested_at timestamptz NOT NULL,
  created_by_admin_user_id varchar NOT NULL REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secure_vault_refs_site
  ON secure_vault_refs (site_config_id);
