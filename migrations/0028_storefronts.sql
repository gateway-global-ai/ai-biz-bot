-- Migration 0028: Storefront categories, reports, demo claims, and static routes for industry landing pages.

-- ── storefront_categories (test category: Nail Salons, Las Vegas) ─────────────
CREATE TABLE IF NOT EXISTS storefront_categories (
  slug VARCHAR PRIMARY KEY,
  display_name VARCHAR NOT NULL,
  location VARCHAR NOT NULL,
  search_query VARCHAR NOT NULL,
  industry_group VARCHAR,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── storefront_reports (cached industry report per category) ──────────────────
CREATE TABLE IF NOT EXISTS storefront_reports (
  category_slug VARCHAR PRIMARY KEY REFERENCES storefront_categories(slug) ON DELETE CASCADE,
  summary TEXT,
  whats_working JSONB DEFAULT '[]',
  whats_not_working JSONB DEFAULT '[]',
  raw_places JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── storefront_category_images (5 Flux images per category) ─────────────────
CREATE TABLE IF NOT EXISTS storefront_category_images (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug VARCHAR NOT NULL REFERENCES storefront_categories(slug) ON DELETE CASCADE,
  image_index INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_slug, image_index)
);

CREATE INDEX IF NOT EXISTS idx_storefront_category_images_slug
  ON storefront_category_images(category_slug);

-- ── storefront_demo_claims (phone → demo site after verify) ──────────────────
CREATE TABLE IF NOT EXISTS storefront_demo_claims (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR NOT NULL,
  site_config_id VARCHAR NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storefront_demo_claims_phone
  ON storefront_demo_claims(phone);
CREATE INDEX IF NOT EXISTS idx_storefront_demo_claims_site
  ON storefront_demo_claims(site_config_id);

-- ── site_configs: static_routes for demo (call, text, email, website) ───────
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS static_routes JSONB DEFAULT NULL;

-- Seed test category: Nail Salons, Las Vegas, NV
INSERT INTO storefront_categories (slug, display_name, location, search_query, industry_group, lat, lng)
VALUES (
  'nail-salons',
  'Nail Salons',
  'Las Vegas, NV',
  'nail salons',
  'health_wellness',
  36.1699,
  -115.1398
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  location = EXCLUDED.location,
  search_query = EXCLUDED.search_query,
  industry_group = EXCLUDED.industry_group,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  updated_at = NOW();
