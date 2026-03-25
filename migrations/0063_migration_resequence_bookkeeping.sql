-- Migration Re-Sequencing Bookkeeping
-- Pre-registers renamed migration filenames in schema_migrations
-- so db:migrate does not attempt to re-apply them.
-- Idempotent: ON CONFLICT DO NOTHING

INSERT INTO schema_migrations (filename) VALUES
  ('0001b_many_wraith.sql'),
  ('0003b_platform_business_map.sql'),
  ('0005b_voice_usage_logs.sql'),
  ('0009b_nova_idv_sessions.sql'),
  ('0013b_industry_agent_templates.sql'),
  ('0014b_reviews_harvested.sql'),
  ('0015b_industry_agent_templates.sql'),
  ('0046b_platform_products_services.sql'),
  ('0054b_voice_concierge_ai_biz_bots_governance.sql'),
  ('0059b_secure_vault_refs.sql')
ON CONFLICT (filename) DO NOTHING;
