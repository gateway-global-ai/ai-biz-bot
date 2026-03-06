-- Migration 0021: Per-site PMS integrations (Cloudbeds, etc.)
-- Each hotel stores its own property ID, API key, and optional OAuth tokens.
-- Enables multi-tenant rates/availability without global env vars.

CREATE TABLE IF NOT EXISTS site_pms_integrations (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id      varchar NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  pms_type            text    NOT NULL,
  property_id         text,
  api_key             text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  booking_engine_url  text,
  config              jsonb   NOT NULL DEFAULT '{}',
  is_active           boolean NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (site_config_id, pms_type)
);

CREATE INDEX IF NOT EXISTS idx_site_pms_site
  ON site_pms_integrations(site_config_id);
