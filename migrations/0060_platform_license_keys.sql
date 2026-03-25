-- Platform software license keys: issued by admins, redeemed by customers per site.
-- Secrets: SHA-256 hex only; key prefix for lookup (prefix gwl_).

CREATE TABLE IF NOT EXISTS platform_license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_prefix varchar(24) NOT NULL,
  secret_hash text NOT NULL,
  sku text NOT NULL,
  label text,
  max_activations integer,
  activation_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  revoked_at timestamptz,
  created_by_admin_id varchar REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_license_keys_prefix_active_uidx
  ON platform_license_keys (key_prefix)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS platform_license_keys_sku_idx ON platform_license_keys (sku);
CREATE INDEX IF NOT EXISTS platform_license_keys_created_idx ON platform_license_keys (created_at DESC);

COMMENT ON TABLE platform_license_keys IS 'Issued software license keys; full key shown once at generate; store hash only.';

CREATE TABLE IF NOT EXISTS platform_license_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key_id uuid NOT NULL REFERENCES platform_license_keys(id) ON DELETE CASCADE,
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  customer_account_id varchar REFERENCES customer_accounts(id) ON DELETE SET NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_key_id, site_config_id)
);

CREATE INDEX IF NOT EXISTS platform_license_activations_site_idx ON platform_license_activations (site_config_id);
CREATE INDEX IF NOT EXISTS platform_license_activations_license_idx ON platform_license_activations (license_key_id);

COMMENT ON TABLE platform_license_activations IS 'Binds a redeemed license key to a site (and optional customer account).';

ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS platform_license_sku text;
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS platform_license_activated_at timestamptz;

COMMENT ON COLUMN site_configs.platform_license_sku IS 'SKU from last successful platform license redemption; informational.';
COMMENT ON COLUMN site_configs.platform_license_activated_at IS 'When the current license entitlement was applied.';
