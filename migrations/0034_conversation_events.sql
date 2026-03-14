-- Conversation events: log actionable routes per call/session (hours, location, website, pricing, etc.) for Cash Board.
CREATE TABLE IF NOT EXISTS conversation_events (
  id BIGSERIAL PRIMARY KEY,
  site_config_id VARCHAR NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  call_sid TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_conversation_events_site_config_id ON conversation_events(site_config_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_occurred_at ON conversation_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_events_event_type ON conversation_events(event_type);
