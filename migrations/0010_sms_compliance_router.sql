-- Migration: 0010_sms_compliance_router
-- Creates the A2P 10DLC Sovereign SMS Router compliance tables.
--
-- sms_intent (enum)  — 6 distinct messaging pipes mapped to separate
--                      Twilio Messaging Service SIDs.
-- sms_opt_outs       — STOP/UNSUBSCRIBE compliance block list.
--                      siteConfigId IS NULL → global platform opt-out.
--                      siteConfigId = UUID  → tenant-scoped opt-out.
-- sms_logs           — Immutable audit ledger for every dispatch attempt.
--                      cost is numeric(10,4) to avoid float rounding on
--                      Twilio's sub-cent billing (e.g. $0.0079/segment).

-- ── Enum ─────────────────────────────────────────────────────────────────────
CREATE TYPE sms_intent AS ENUM (
  'PLATFORM_OTP',
  'PLATFORM_CARE',
  'PLATFORM_MKTG',
  'CUSTOMER_OTP',
  'CUSTOMER_CARE',
  'CUSTOMER_MKTG'
);

-- ── sms_opt_outs ─────────────────────────────────────────────────────────────
CREATE TABLE sms_opt_outs (
  id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    text NOT NULL,
  site_config_id  varchar REFERENCES site_configs(id) ON DELETE CASCADE,
  reason          text NOT NULL DEFAULT 'STOP keyword received',
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_opt_outs_phone
  ON sms_opt_outs (phone_number);

CREATE INDEX idx_sms_opt_outs_phone_site
  ON sms_opt_outs (phone_number, site_config_id);

-- ── sms_logs ─────────────────────────────────────────────────────────────────
CREATE TABLE sms_logs (
  id                    varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id        varchar NOT NULL REFERENCES site_configs(id) ON DELETE SET NULL,
  twilio_message_sid    text,
  messaging_service_sid text NOT NULL,
  intent                sms_intent NOT NULL,
  to_phone_number       text NOT NULL,
  from_phone_number     text,
  body                  text NOT NULL,
  status                text NOT NULL DEFAULT 'queued',
  segments              integer NOT NULL DEFAULT 1,
  cost                  numeric(10, 4),
  error_message         text,
  created_at            timestamp NOT NULL DEFAULT now(),
  updated_at            timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_site_config_id
  ON sms_logs (site_config_id);

CREATE INDEX idx_sms_logs_intent
  ON sms_logs (intent);

CREATE INDEX idx_sms_logs_created_at
  ON sms_logs (created_at);
