-- Social Sharing (OG / meta) per site for dashboard management and crawler injection.
-- Idempotent: safe to re-run.
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS social_sharing jsonb DEFAULT '{}';

COMMENT ON COLUMN site_configs.social_sharing IS 'Open Graph and meta tags for social sharing: ogTitle, ogDescription, ogImage, ogUrl, ogSiteName, ogType, twitterCard. Empty fields are filled from site name, hero image, and public URL at serve time.';
