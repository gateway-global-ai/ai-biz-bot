-- Seed the ai-biz-bots site config and demo agent so /agent/ai-biz-bots works out of the box.
-- Safe to re-run: all inserts use WHERE NOT EXISTS guards.

-- 1. Ensure the platform-level site config exists (slug = 'ai-biz-bots' is how AgentPage looks it up)
INSERT INTO site_configs (
  name,
  slug,
  workspace_state,
  plan,
  system_prompt_override
)
SELECT
  'Gateway Global AI Biz Bot',
  'ai-biz-bots',
  'demo',
  'pro',
  'You are the AI Biz Bot for Gateway Global AI. You help business owners understand how to deploy AI agents, design their voice concierge, and build out their AI OS. Be warm, consultative, and concise. Keep introductions under 10 seconds.'
WHERE NOT EXISTS (
  SELECT 1 FROM site_configs WHERE slug = 'ai-biz-bots'
);

-- 2. Ensure a demo agent exists for this site config
INSERT INTO agents (
  site_config_id,
  name,
  role_type,
  status,
  voice_id,
  voice_name,
  dominance,
  influence,
  steadiness,
  conscientiousness,
  arch_profile,
  system_prompt
)
SELECT
  sc.id,
  'AI Biz Bot',
  'concierge',
  'active',
  'puck',
  'Puck',
  20,
  45,
  80,
  75,
  '{"acknowledge":30,"reflect":30,"context":60,"handoff":20,"responseWindowSeconds":10}'::jsonb,
  'You are the AI Biz Bot for Gateway Global AI. Help business owners explore the platform and understand how to deploy their own AI voice agents. Be consultative, friendly, and concise.'
FROM site_configs sc
WHERE sc.slug = 'ai-biz-bots'
  AND NOT EXISTS (
    SELECT 1 FROM agents a WHERE a.site_config_id = sc.id AND a.role_type = 'concierge'
  );

-- 3. Set assigned_agent_id if it is currently NULL
UPDATE site_configs
SET assigned_agent_id = (
  SELECT a.id FROM agents a
  WHERE a.site_config_id = site_configs.id
    AND a.role_type = 'concierge'
    AND a.status = 'active'
  ORDER BY a.created_at
  LIMIT 1
)
WHERE site_configs.slug = 'ai-biz-bots'
  AND site_configs.assigned_agent_id IS NULL;
