-- Migration: 0009_granular_resource_ledger
-- Replaces single minute_balance with four cost-center columns for accurate
-- isolation of Twilio telecom costs from WebRTC and text compute costs.

ALTER TABLE site_configs ADD COLUMN voice_phone_ai_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE site_configs ADD COLUMN voice_web_ai_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE site_configs ADD COLUMN sms_messages integer NOT NULL DEFAULT 0;
ALTER TABLE site_configs ADD COLUMN chat_bot_messages integer NOT NULL DEFAULT 0;

-- Backfill existing paid minutes into the Telephony pool (only if minute_balance exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_configs' AND column_name = 'minute_balance'
  ) THEN
    UPDATE site_configs SET voice_phone_ai_minutes = COALESCE(minute_balance, 0);
    ALTER TABLE site_configs DROP COLUMN minute_balance;
  END IF;
END $$;
