-- Demo site configs for home page QR: Voice AI Assistant (Target), The Joint Chiropractic
-- Idempotent: only insert if slug does not exist.

INSERT INTO site_configs (id, name, slug, workspace_state, chatbot_enabled, voice_concierge_enabled)
SELECT gen_random_uuid(), 'Voice AI Assistant (Target)', 'voice-ai-assistant', 'demo', true, true
WHERE NOT EXISTS (SELECT 1 FROM site_configs WHERE slug = 'voice-ai-assistant');

INSERT INTO site_configs (id, name, slug, workspace_state, chatbot_enabled, voice_concierge_enabled)
SELECT gen_random_uuid(), 'The Joint Chiropractic', 'the-joint-chiropractic', 'demo', true, true
WHERE NOT EXISTS (SELECT 1 FROM site_configs WHERE slug = 'the-joint-chiropractic');
