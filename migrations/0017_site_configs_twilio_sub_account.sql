-- 0017_site_configs_twilio_sub_account.sql
-- Idempotent: ADD COLUMN IF NOT EXISTS safe on all environments.
-- Fixes: column "twilio_sub_account_sid" does not exist (site_configs).

ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS twilio_sub_account_sid TEXT;

ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS provisioned_phone_number TEXT;

ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS provisioned_phone_sid TEXT;
