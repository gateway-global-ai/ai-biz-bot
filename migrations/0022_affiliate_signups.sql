-- Affiliate program signups: phone number to receive registration link
CREATE TABLE IF NOT EXISTS affiliate_signups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_signups_phone ON affiliate_signups(phone);
CREATE INDEX IF NOT EXISTS idx_affiliate_signups_created_at ON affiliate_signups(created_at DESC);
