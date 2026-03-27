-- Canvas Syscall Audit Log — Gateway Global AI OS
-- Implements CanvasSyscallAuditRecord (canvas_control.md §17)
-- Every canvas syscall writes a record here for replay, forensic debugging,
-- performance tracking, and governance proof.

CREATE TABLE IF NOT EXISTS canvas_events (
  syscall_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turn_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  site_config_id VARCHAR REFERENCES site_configs(id) ON DELETE SET NULL,
  visitor_id TEXT,

  syscall TEXT NOT NULL CHECK (
    syscall IN ('canvas.resolve', 'canvas.render', 'canvas.patch', 'canvas.clear', 'canvas.action')
  ),
  source TEXT NOT NULL CHECK (
    source IN (
      'voice_turn_orchestrator', 'canvas_intent_router', 'skill_dispatch',
      'canvas_action_handler', 'system_recovery', 'legacy_adapter'
    )
  ),

  previous_view_id TEXT,
  next_view_id TEXT,

  selected_intent TEXT,
  intent_confidence NUMERIC(5, 4),

  validation_status TEXT NOT NULL CHECK (validation_status IN ('passed', 'failed')),
  error_code TEXT,

  directive_json JSONB,
  latency_ms INTEGER,
  tool_invocations TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_events_turn ON canvas_events(turn_id);
CREATE INDEX IF NOT EXISTS idx_canvas_events_session ON canvas_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_events_site ON canvas_events(site_config_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_events_validation ON canvas_events(validation_status, created_at DESC);
