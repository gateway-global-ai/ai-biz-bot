-- Migration 0068: Add security_level and verified_phone to visitor_sessions
-- security_level: anonymous | phone_verified | admin
-- verified_phone: phone number if OTP-verified

ALTER TABLE visitor_sessions
  ADD COLUMN IF NOT EXISTS security_level TEXT NOT NULL DEFAULT 'anonymous',
  ADD COLUMN IF NOT EXISTS verified_phone TEXT;

-- Index for fast security-level lookups during PTT session routing
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_security_level
  ON visitor_sessions (security_level);
