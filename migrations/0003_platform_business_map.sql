-- Platform Business Map: stable internal identity layer
-- Decouples internal references from mutable external identifiers (Google place_id, etc.)

CREATE TABLE IF NOT EXISTS platform_business_map (
  platform_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id  varchar NOT NULL UNIQUE REFERENCES site_configs(id) ON DELETE CASCADE,
  google_cid      text UNIQUE,
  google_place_id text,
  serpapi_data_id text,
  category_slug   text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_map_place_id
  ON platform_business_map(google_place_id);

CREATE INDEX IF NOT EXISTS idx_platform_map_serpapi_id
  ON platform_business_map(serpapi_data_id);

-- Backfill: one row per site_config (google_place_id may be NULL for digital-only sites).
-- Idempotent via ON CONFLICT DO NOTHING.
INSERT INTO platform_business_map (site_config_id, google_place_id)
SELECT id, place_id
FROM   site_configs
ON CONFLICT (site_config_id) DO NOTHING;
