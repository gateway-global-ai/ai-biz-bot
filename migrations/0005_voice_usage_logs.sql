-- Migration: 0005_voice_usage_logs
-- Adds the Energy Pool billing tables for the Usage Ledger feature.

-- Add prepaid minute balance to site_configs (NULL = unrestricted)
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "minute_balance" integer;

-- Voice Usage Logs: one row per billed call
CREATE TABLE IF NOT EXISTS "voice_usage_logs" (
  "id"                    varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_config_id"        varchar NOT NULL REFERENCES "site_configs"("id") ON DELETE CASCADE,
  "call_sid"              text,
  "call_type"             text NOT NULL DEFAULT 'phone',
  "raw_duration_seconds"  integer NOT NULL DEFAULT 0,
  "billed_minutes"        integer NOT NULL DEFAULT 0,
  "rate_per_minute_cents" integer NOT NULL DEFAULT 10,
  "billed_amount_cents"   integer NOT NULL DEFAULT 0,
  "created_at"            timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_voice_usage_site_config_id" ON "voice_usage_logs" ("site_config_id");
CREATE INDEX IF NOT EXISTS "idx_voice_usage_created_at"     ON "voice_usage_logs" ("created_at");
