-- Sentinel site_configs row for marketing home / Agents landing.
-- Required for visitor_sessions.site_config_id FK and other references to id = platform_landing.
-- Voice proxy still treats this id as "public Nova" (see geminiVoice contextual snap skip); do not use for tenant CRM.
-- Idempotent: safe if scripts/seed-platform-landing.ts already ran.

INSERT INTO site_configs (
  id,
  name,
  workspace_state,
  chatbot_enabled,
  voice_concierge_enabled,
  plan
)
VALUES (
  'platform_landing',
  'Gateway Global AI HQ',
  'demo',
  true,
  true,
  'free'
)
ON CONFLICT (id) DO NOTHING;
