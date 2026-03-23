-- Domain verification timestamp (e.g. after Hostinger verify-ownership succeeds)
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP;
