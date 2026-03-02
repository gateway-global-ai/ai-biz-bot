-- ============================================================================
-- 0009: NOVA Sovereign IDV Sessions
-- Constitution: .system_design/nova_sovereign_ruleset_v1.yaml database_schema
-- Version 1.0.0 — signed and locked. Do not alter without constitution update.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nova_idv_sessions (
  session_id     UUID PRIMARY KEY,
  business_id    UUID NOT NULL,
  client_phone   TEXT,
  client_email   TEXT,
  protocol_level INTEGER NOT NULL,
  otp_verified   BOOLEAN DEFAULT FALSE,
  magic_link_verified BOOLEAN DEFAULT FALSE,
  biometric_verified  BOOLEAN DEFAULT FALSE,
  id_verified    BOOLEAN DEFAULT FALSE,
  signature_url  TEXT,
  invoice_id     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nova_idv_sessions_business_id
  ON nova_idv_sessions (business_id);

CREATE INDEX IF NOT EXISTS idx_nova_idv_sessions_created_at
  ON nova_idv_sessions (created_at);
