-- Pitch decks: deep research / market-fit presentations (e.g. The Joint Chiropractic)
-- Stored by slug; category/industry for filtering. Content is JSON (slides).
CREATE TABLE IF NOT EXISTS pitch_decks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR NOT NULL UNIQUE,
  title TEXT NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"slides":[]}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitch_decks_slug ON pitch_decks(slug);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_category ON pitch_decks(category);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_industry ON pitch_decks(industry);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_created_at ON pitch_decks(created_at DESC);
