-- Error Navigator & Recovery Analytics
-- Tracks ERROR_LANDING, RECOVERY_SUCCESS, and VOICE_TIER_INTEREST events for
-- bounce-prevention and recovery analytics on the ErrorNavigator flywheel.

CREATE TABLE IF NOT EXISTS analytics_logs (
  id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id varchar REFERENCES site_configs(id) ON DELETE SET NULL,
  event_type     text NOT NULL,
  metadata       jsonb,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_logs_event_type
  ON analytics_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_logs_site_config_id
  ON analytics_logs (site_config_id);

CREATE INDEX IF NOT EXISTS idx_analytics_logs_created_at
  ON analytics_logs (created_at DESC);
