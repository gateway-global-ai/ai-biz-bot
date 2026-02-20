-- Migration 0003: Platform business map + enrichment snapshots
-- Depends on: site_configs (already exists)

-- Platform business map: one row per onboarded platformId.
-- Acts as the stable identity anchor for all enrichment data.
CREATE TABLE IF NOT EXISTS platform_business_map (
  platform_id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  serpapi_data_id text,
  google_place_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_business_map_site_config_id
  ON platform_business_map(site_config_id);

CREATE INDEX IF NOT EXISTS idx_platform_business_map_google_place_id
  ON platform_business_map(google_place_id);

-- Enrichment snapshots: raw SerpApi payloads stored per platformId.
-- Written only by the admin enrich_business_profile tool; never by voice path.
CREATE TABLE IF NOT EXISTS platform_business_enrichment_snapshots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id varchar NOT NULL REFERENCES platform_business_map(platform_id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_snapshots_platform_id
  ON platform_business_enrichment_snapshots(platform_id);

CREATE INDEX IF NOT EXISTS idx_enrichment_snapshots_provider
  ON platform_business_enrichment_snapshots(provider);

CREATE INDEX IF NOT EXISTS idx_enrichment_snapshots_platform_provider
  ON platform_business_enrichment_snapshots(platform_id, provider);
