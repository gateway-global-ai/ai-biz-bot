-- Operator integration connect tokens — narrow authority for SMS deep-links (INTEGRATION_OPERATOR_CONNECT_FLOW_V1).
-- Opaque token is shown once; only HMAC digest is stored.

CREATE TABLE IF NOT EXISTS integration_connect_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  vendor_id text NOT NULL,
  connect_lane text NOT NULL,
  phone_e164 text,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_connect_tokens_token_hash_uidx
  ON integration_connect_tokens (token_hash);

CREATE INDEX IF NOT EXISTS integration_connect_tokens_site_created_idx
  ON integration_connect_tokens (site_config_id, created_at DESC);

COMMENT ON TABLE integration_connect_tokens IS 'Short-lived single-use tokens for operator PMS/integration connect flows (not general login)';
COMMENT ON COLUMN integration_connect_tokens.vendor_id IS 'e.g. cloudbeds — allowlisted per product';
COMMENT ON COLUMN integration_connect_tokens.connect_lane IS 'oauth | api_key — which completion path the UI/API accepts';
COMMENT ON COLUMN integration_connect_tokens.token_hash IS 'HMAC-SHA256 hex digest; plain token never stored';
