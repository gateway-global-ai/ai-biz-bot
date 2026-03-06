-- Migration 0020: Business slug (public URL) + share event tracking
-- Adds slug and share_count to site_configs, creates share_events table.

-- ── site_configs additions ───────────────────────────────────────────────────
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS slug VARCHAR,
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

-- Unique sparse index (allows NULLs but enforces uniqueness among non-NULL slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_configs_slug
  ON site_configs (slug)
  WHERE slug IS NOT NULL;

-- ── share_events (new table) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_events (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id   VARCHAR NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  referrer_user_id VARCHAR,            -- NULL for anonymous / unverified shares
  platform         VARCHAR NOT NULL,   -- 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'sms' | 'email' | 'copy'
  shared_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_events_site
  ON share_events (site_config_id);

CREATE INDEX IF NOT EXISTS idx_share_events_referrer
  ON share_events (referrer_user_id)
  WHERE referrer_user_id IS NOT NULL;
