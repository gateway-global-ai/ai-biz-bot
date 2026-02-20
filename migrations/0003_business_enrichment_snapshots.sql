-- Migration 0003: Platform business map + enrichment snapshots
-- Depends on: site_configs (already exists)

-- Platform business map: one row per onboarded platformId.
-- Acts as the stable identity anchor for all enrichment data.
CREATE TABLE IF NOT EXISTS platform_business_map (
  platform_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar NOT NULL UNIQUE REFERENCES site_configs(id) ON DELETE CASCADE,
  google_cid text UNIQUE,
  google_place_id text,
  serpapi_data_id text,
  category_slug text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_map_place_id
  ON platform_business_map(google_place_id);

CREATE INDEX IF NOT EXISTS idx_platform_map_serpapi_id
  ON platform_business_map(serpapi_data_id);

-- Auto-update updated_at on every row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_business_map_updated_at ON platform_business_map;
CREATE TRIGGER trg_platform_business_map_updated_at
  BEFORE UPDATE ON platform_business_map
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enrichment snapshots: raw SerpApi payloads stored per platformId.
-- Written only by the admin enrich_business_profile tool; never by voice path.
CREATE TABLE IF NOT EXISTS platform_business_enrichment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES platform_business_map(platform_id) ON DELETE CASCADE,
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

-- Index on provider_ref for fast lookup by SerpApi data_id or other external key.
CREATE INDEX IF NOT EXISTS idx_enrichment_snapshots_provider_ref
  ON platform_business_enrichment_snapshots(provider_ref)
  WHERE provider_ref IS NOT NULL;
