-- Operational Mode: foundational template for agent (SAFE, CONCIERGE, RECEPTIONIST, etc.).
-- Enforcement: prompt compiler injects mode directive; backend filters tool set by mode.
-- Idempotent.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS operational_mode text DEFAULT 'SAFE';

COMMENT ON COLUMN agents.operational_mode IS 'Primary mode: SAFE, CONCIERGE, RECEPTIONIST, SALES, CASHIER, CUSTOMER_SUPPORT, MANAGER, RESEARCH, CODING, REVIEW. Drives prompt directive and tool allowlist.';

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS verification_level text;

COMMENT ON COLUMN agents.verification_level IS 'For CUSTOMER_SUPPORT mode: required verification level (e.g. OTP, magic_link).';
