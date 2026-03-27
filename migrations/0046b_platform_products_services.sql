-- Migration 0046: Platform Products & Services
-- Enables non-Google-Maps businesses and per-site product/service catalog with Stripe sync

-- 1. Non-maps business support on site_configs
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'google_maps',  -- 'google_maps' | 'custom'
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website text;

-- 2. Platform products/services catalog (1 catalog per site, each row = 1 product/service)
CREATE TABLE IF NOT EXISTS platform_products (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_config_id      text NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  agent_id            text REFERENCES agents(id) ON DELETE SET NULL,  -- agent that sells/fulfills this
  name                text NOT NULL,
  description         text,
  type                text NOT NULL DEFAULT 'service',  -- 'product' | 'service' | 'subscription'
  price_cents         integer NOT NULL DEFAULT 0,
  billing_interval    text,                             -- 'month' | 'year' | null for one-time
  stripe_product_id   text,                             -- set after Stripe sync
  stripe_price_id     text,                             -- set after Stripe sync
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_products_site ON platform_products(site_config_id);
CREATE INDEX IF NOT EXISTS idx_platform_products_agent ON platform_products(agent_id);
