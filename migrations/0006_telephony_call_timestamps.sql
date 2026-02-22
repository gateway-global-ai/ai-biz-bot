-- Migration: 0006_telephony_call_timestamps
-- Adds millisecond-precision stopwatch columns to call_logs and a
-- site_config_id attribution link to telephony_configs (M3 Telephony Core).

-- call_logs: per-call stopwatch (call_start / call_end) and billing attribution
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "call_start"     timestamp;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "call_end"       timestamp;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "actual_seconds" integer;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "site_config_id" varchar;

-- telephony_configs: link each config to the site it belongs to
ALTER TABLE "telephony_configs" ADD COLUMN IF NOT EXISTS "site_config_id" varchar;

CREATE INDEX IF NOT EXISTS "idx_call_logs_call_sid"    ON "call_logs" ("call_sid");
CREATE INDEX IF NOT EXISTS "idx_call_logs_site_config" ON "call_logs" ("site_config_id");
