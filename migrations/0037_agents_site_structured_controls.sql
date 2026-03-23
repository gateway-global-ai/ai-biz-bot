-- Structured controls for chat-first agent behavior: guardrails (always/never/believe) and mirroring.
-- Idempotent.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS structured_controls jsonb DEFAULT '{}';

COMMENT ON COLUMN agents.structured_controls IS 'Optional: { mirroring?: { enabled?: boolean, intensity?: number }, guardrails?: { always?: string[], never?: string[], believe?: string[] } }';

ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS structured_guardrails jsonb DEFAULT '{}';

COMMENT ON COLUMN site_configs.structured_guardrails IS 'User-directed guardrails: { always?: string[], never?: string[], believe?: string[] }. Merged with agent.structured_controls at compile time.';
