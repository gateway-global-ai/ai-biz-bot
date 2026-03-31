-- Integration auth / credential governance (v1) — property connection posture and scope attestation.
-- Brokers enforce runtime checks against these columns.

ALTER TABLE site_pms_integrations
  ADD COLUMN IF NOT EXISTS auth_lane text,
  ADD COLUMN IF NOT EXISTS scopes_granted jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS api_version_lane text,
  ADD COLUMN IF NOT EXISTS install_posture text NOT NULL DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS connection_health jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_refresh_at timestamptz;

COMMENT ON COLUMN site_pms_integrations.auth_lane IS 'api_key_property | api_key_partner_delivery | oauth2';
COMMENT ON COLUMN site_pms_integrations.scopes_granted IS 'Logical scope_ids attested or returned by vendor; ["*"] = operator attested full access';
COMMENT ON COLUMN site_pms_integrations.api_version_lane IS 'e.g. cloudbeds_v1_3; falls back to env-derived lane when null';
COMMENT ON COLUMN site_pms_integrations.install_posture IS 'draft | connected | degraded | revoked';
