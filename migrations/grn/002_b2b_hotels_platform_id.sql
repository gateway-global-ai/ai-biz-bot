-- GRN Hotel Enrichment × Platform Identity
-- Links b2b_hotels rows to platform_business_map so GRN hotel codes can be
-- resolved back to our internal platform_id and Google Places ID.

ALTER TABLE b2b_hotels
  ADD COLUMN IF NOT EXISTS platform_id UUID
    REFERENCES platform_business_map(platform_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_hotels_platform_id ON b2b_hotels(platform_id);
CREATE INDEX IF NOT EXISTS idx_b2b_hotels_hotel_code  ON b2b_hotels(hotel_code);
