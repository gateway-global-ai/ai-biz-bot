-- Migration: 0007_resellers_commissions
-- Creates the Reseller hierarchy and commission-tracking tables.
-- Apply with: doppler run -- npx drizzle-kit push

-- resellers: one row per reseller partner in the hierarchy
CREATE TABLE IF NOT EXISTS "resellers" (
  "id"               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"             text        NOT NULL,
  "email"            text        NOT NULL UNIQUE,
  "phone"            text,
  "company"          text,
  "parent_reseller_id" varchar   REFERENCES "resellers"("id") ON DELETE SET NULL,
  "commission_rate"  numeric(5, 4) NOT NULL DEFAULT 0.10, -- e.g. 0.10 = 10 %
  "stripe_account_id" text,
  "is_active"        boolean     NOT NULL DEFAULT true,
  "created_at"       timestamp   NOT NULL DEFAULT now(),
  "updated_at"       timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_resellers_parent_id"  ON "resellers" ("parent_reseller_id");
CREATE INDEX IF NOT EXISTS "idx_resellers_email"      ON "resellers" ("email");

-- reseller_commissions: one row per commission event (subscription payment, top-up, etc.)
CREATE TABLE IF NOT EXISTS "reseller_commissions" (
  "id"               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "reseller_id"      varchar     NOT NULL REFERENCES "resellers"("id") ON DELETE CASCADE,
  "customer_account_id" varchar  REFERENCES "customer_accounts"("id") ON DELETE SET NULL,
  "stripe_payment_intent_id" text,
  "event_type"       text        NOT NULL, -- 'subscription' | 'top_up' | 'manual'
  "gross_amount"     integer     NOT NULL, -- cents
  "commission_amount" integer    NOT NULL, -- cents
  "commission_rate"  numeric(5, 4) NOT NULL,
  "status"           text        NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  "paid_at"          timestamp,
  "created_at"       timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_reseller_commissions_reseller_id" ON "reseller_commissions" ("reseller_id");
CREATE INDEX IF NOT EXISTS "idx_reseller_commissions_customer_id" ON "reseller_commissions" ("customer_account_id");
CREATE INDEX IF NOT EXISTS "idx_reseller_commissions_status"      ON "reseller_commissions" ("status");
