-- Migration 0049: Brand Governance, Sales Funnels, Strategy Config
-- Adds three JSONB columns to site_configs for the Brand Governance system.
-- Safe to re-run (IF NOT EXISTS / IF NOT EXISTS pattern).

ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS brand_governance  JSONB,
  ADD COLUMN IF NOT EXISTS sales_funnels     JSONB,
  ADD COLUMN IF NOT EXISTS strategy_config   JSONB;

-- Index on completion score for efficient preflight queries
CREATE INDEX IF NOT EXISTS idx_site_configs_brand_governance_score
  ON site_configs ((brand_governance->>'completionScore'));

-- Index on owner approval status
CREATE INDEX IF NOT EXISTS idx_site_configs_brand_governance_approved
  ON site_configs ((brand_governance->>'ownerApproved'));

COMMENT ON COLUMN site_configs.brand_governance IS
  'Brand identity: 15-field profile (brandName, brandSlogan, brandLogoUrl, primaryColor, accentColor, claim, differentiator, irresistibleOffer, freeTrial, guarantee, targetMarket, channelPartners, coreProducts, productUpsells, coreServices, serviceUpsells) plus completionScore, ownerApproved, approvedAt. See docs-governance/BRAND_IDENTITY_SPEC.md.';

COMMENT ON COLUMN site_configs.sales_funnels IS
  'Array of sales funnel definitions. Each funnel: { id, name, terminalAction, entryPoints, digitalTree, fallbackRoutes }. Multiple funnels supported. See docs-governance/SALES_FUNNEL_SPEC.md.';

COMMENT ON COLUMN site_configs.strategy_config IS
  'General strategy configuration: { ownerApproved, approvedAt, preflightPassedAt, workflowPhase }. Tracks deployment phase and approval state.';
