-- Add per-business subscription plan to site_configs
-- Plan values: 'free' | 'pro' | 'voice' | 'enterprise'
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- Index for efficient plan-based queries
CREATE INDEX IF NOT EXISTS idx_site_configs_plan ON site_configs (plan);
