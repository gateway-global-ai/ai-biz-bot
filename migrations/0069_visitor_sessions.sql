-- Persistent buyer journey payload node.
-- Each row accumulates cross-session context for a visitor keyed to a site.
-- buyer_journey JSONB stores structured phase, pain points, objections, and signals.

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id      TEXT NOT NULL,
  site_config_id  TEXT NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel         TEXT NOT NULL DEFAULT 'web',
  buyer_journey   JSONB NOT NULL DEFAULT '{}'::jsonb,
  security_level  TEXT NOT NULL DEFAULT 'anonymous',
  verified_phone  TEXT,
  UNIQUE (visitor_id, site_config_id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_site
  ON visitor_sessions (site_config_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor
  ON visitor_sessions (visitor_id);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_security_level
  ON visitor_sessions (security_level);
