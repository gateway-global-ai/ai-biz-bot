-- Knowledge library per site: JSONB array of { id, title, content, addedAt }
-- Used to train the site's chat/voice agent with custom content (e.g. research docs, menus, FAQs).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'site_configs'
  ) THEN
    ALTER TABLE public.site_configs
      ADD COLUMN IF NOT EXISTS knowledge_library jsonb;
  END IF;
END $$;
