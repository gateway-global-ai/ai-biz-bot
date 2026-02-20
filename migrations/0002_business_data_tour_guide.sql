-- Business data cache, owner data, intelligence cache, tour specs (Clear Voice / Tour Guide)

CREATE TABLE IF NOT EXISTS business_data_cache (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  general_data jsonb NOT NULL,
  intelligence_data jsonb,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_business_data (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  owner_id varchar REFERENCES customer_accounts(id),
  custom_description text,
  special_offers jsonb,
  owner_story text,
  custom_hours text,
  contact_preferences jsonb,
  public_amenities jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add public_amenities column if table already exists
ALTER TABLE owner_business_data ADD COLUMN IF NOT EXISTS public_amenities jsonb;

CREATE TABLE IF NOT EXISTS business_intelligence_cache (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  business_name text NOT NULL,
  report jsonb NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_specifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text,
  partner_id text,
  tour_id text NOT NULL UNIQUE,
  spec jsonb NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_data_cache_place_id ON business_data_cache(place_id);
CREATE INDEX IF NOT EXISTS idx_business_data_cache_expires_at ON business_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_owner_business_data_place_id ON owner_business_data(place_id);
CREATE INDEX IF NOT EXISTS idx_owner_business_data_owner_id ON owner_business_data(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_intelligence_cache_place_id ON business_intelligence_cache(place_id);
CREATE INDEX IF NOT EXISTS idx_business_intelligence_cache_expires_at ON business_intelligence_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tour_specifications_place_id ON tour_specifications(place_id);
CREATE INDEX IF NOT EXISTS idx_tour_specifications_tour_id ON tour_specifications(tour_id);

-- Featured Partners table (for preferential placement)
CREATE TABLE IF NOT EXISTS featured_partners (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_hotel_id varchar,
  google_place_id text,
  business_name text NOT NULL,
  city_code text NOT NULL,
  category text,
  ai_hook text,
  ai_tags jsonb,
  ai_story text,
  ai_trigger_conditions jsonb,
  ui_theme_glow text,
  badge_label text DEFAULT 'Certified Local',
  story_video_url text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_partners_city_code ON featured_partners(city_code);
CREATE INDEX IF NOT EXISTS idx_featured_partners_google_place_id ON featured_partners(google_place_id);
CREATE INDEX IF NOT EXISTS idx_featured_partners_is_active ON featured_partners(is_active);
