-- Knowledge library per site: JSONB array of { id, title, content, addedAt }
-- Used to train the site's chat/voice agent with custom content (e.g. research docs, menus, FAQs).
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS knowledge_library jsonb;
