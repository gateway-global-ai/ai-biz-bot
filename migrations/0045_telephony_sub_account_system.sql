-- Migration 0045: Per-Business Twilio Sub-Account System
-- Implements: 1 voice plan per business, 1 number per agent, max 10 agents per business
-- Admin can provision from master account pool; owners manage their own sub-account

-- 1. voice_plan_active flag on site_configs
--    true = owner has paid $50/mo Voice AI Package; sub-account and provisioning unlocked
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS voice_plan_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_plan_activated_at timestamp,
  ADD COLUMN IF NOT EXISTS voice_sub_account_sid text,         -- Twilio sub-account SID for this business
  ADD COLUMN IF NOT EXISTS voice_sub_account_auth_token text,  -- encrypted auth token for sub-account
  ADD COLUMN IF NOT EXISTS voice_sub_account_friendly_name text;

-- 2. agent_phone_assignments: 1 number per agent, scoped to a site
CREATE TABLE IF NOT EXISTS agent_phone_assignments (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_config_id      text NOT NULL REFERENCES site_configs(id) ON DELETE CASCADE,
  agent_id            text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  phone_number        text NOT NULL,          -- E.164
  phone_sid           text NOT NULL,          -- Twilio IncomingPhoneNumber SID
  sub_account_sid     text,                   -- which Twilio sub-account owns this number
  friendly_name       text,
  voice_url           text,
  sms_url             text,
  is_primary          boolean NOT NULL DEFAULT false, -- primary trunk number for this site
  assigned_at         timestamp NOT NULL DEFAULT now(),
  released_at         timestamp,              -- null = active, set = released
  released_by         text,                  -- 'owner' | 'admin' | 'system'
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  UNIQUE (agent_id),                          -- 1 number per agent
  UNIQUE (phone_number)                       -- 1 number per assignment (can be re-assigned after release)
);

CREATE INDEX IF NOT EXISTS idx_agent_phone_assignments_site
  ON agent_phone_assignments(site_config_id);

CREATE INDEX IF NOT EXISTS idx_agent_phone_assignments_agent
  ON agent_phone_assignments(agent_id);

-- 3. platform_number_pool: admin-managed pool of numbers provisioned on master account
--    Admin can pull these in and assign to businesses without requiring a business sub-account
CREATE TABLE IF NOT EXISTS platform_number_pool (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone_number    text NOT NULL UNIQUE,       -- E.164
  phone_sid       text NOT NULL UNIQUE,       -- Twilio IncomingPhoneNumber SID
  area_code       text,
  friendly_name   text,
  region          text,
  locality        text,
  account_sid     text NOT NULL,              -- master or sub-account SID that owns this number
  status          text NOT NULL DEFAULT 'available',  -- 'available' | 'assigned' | 'reserved'
  assigned_to_site_config_id text REFERENCES site_configs(id) ON DELETE SET NULL,
  assigned_to_agent_id text REFERENCES agents(id) ON DELETE SET NULL,
  assigned_at     timestamp,
  voice_url       text,
  sms_url         text,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_number_pool_status
  ON platform_number_pool(status);

CREATE INDEX IF NOT EXISTS idx_platform_number_pool_site
  ON platform_number_pool(assigned_to_site_config_id);
