-- Slug landings: optional tracking when user lands on /biz/:slug with ?from=qr (website QR).
CREATE TABLE IF NOT EXISTS slug_landings (
  id BIGSERIAL PRIMARY KEY,
  site_config_id VARCHAR NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  landed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'qr'
);

CREATE INDEX IF NOT EXISTS idx_slug_landings_site_config_id ON slug_landings(site_config_id);
CREATE INDEX IF NOT EXISTS idx_slug_landings_landed_at ON slug_landings(landed_at DESC);
