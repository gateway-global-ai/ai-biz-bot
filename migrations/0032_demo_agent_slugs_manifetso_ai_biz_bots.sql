-- Demo site configs for home page QR codes: /biz/manifetso and /biz/ai-biz-bots
-- Idempotent: only insert if slug does not exist.

INSERT INTO site_configs (id, name, slug, workspace_state, chatbot_enabled, voice_concierge_enabled)
SELECT gen_random_uuid(), 'Manifetso', 'manifetso', 'demo', true, true
WHERE NOT EXISTS (SELECT 1 FROM site_configs WHERE slug = 'manifetso');

INSERT INTO site_configs (id, name, slug, workspace_state, chatbot_enabled, voice_concierge_enabled)
SELECT gen_random_uuid(), 'AI Biz Bots', 'ai-biz-bots', 'demo', true, true
WHERE NOT EXISTS (SELECT 1 FROM site_configs WHERE slug = 'ai-biz-bots');
