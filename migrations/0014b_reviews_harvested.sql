-- Migration 0014: Reviews Harvested Counter
-- Tracks total SerpAPI reviews harvested per site for billing purposes.
-- Billing: first 10 reviews per site are free; $0.10 per review above 10.

ALTER TABLE "site_configs"
  ADD COLUMN IF NOT EXISTS "reviews_harvested" integer DEFAULT 0;

COMMENT ON COLUMN "site_configs"."reviews_harvested" IS
  'Total SerpAPI reviews harvested for this site. Billing triggers above 10.';
