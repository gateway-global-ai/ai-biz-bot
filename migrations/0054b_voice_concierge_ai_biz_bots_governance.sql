-- Voice Concierge (Gateway Global AI demo): communication plane + platform marketing metadata for ai-biz-bots
-- Idempotent: safe to re-run

UPDATE site_configs
SET
  communication_governance = COALESCE(communication_governance, '{}'::jsonb)
    || '{"disclosurePolicyId":"contextual","principalOfRecord":"customer","pppEngagement":{"enabled":true,"mode":"sales_emphasis"}}'::jsonb,
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"platformMarketingDemo":true}'::jsonb,
  updated_at = NOW()
WHERE slug = 'ai-biz-bots';
