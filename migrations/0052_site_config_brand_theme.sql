-- Brand Theme — adds brand_theme column to site_configs
-- Stores the preset theme key (e.g. 'gateway-dark') from BRAND_THEMES in brand.ts.
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS brand_theme text DEFAULT 'gateway-dark';
