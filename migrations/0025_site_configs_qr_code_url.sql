-- Store generated QR code URL per business (served at /api/qr/image/:slug)
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

CREATE INDEX IF NOT EXISTS idx_site_configs_qr_code_url ON site_configs(qr_code_url) WHERE qr_code_url IS NOT NULL;
