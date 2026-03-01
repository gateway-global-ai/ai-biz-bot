-- 0011_compliance_reseller_gateway.sql
-- Onboarding & Compliance Gateway (MSA v1.0.0) + Reseller Franchise Hierarchy (MSA v1.1.0 Addendum)
-- Safe migration: all ALTER TABLE statements use ADD COLUMN IF NOT EXISTS.
-- All new columns are nullable or carry defaults — zero data loss risk.

-- ─── Step 1: Create Enums ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."onboarding_status" AS ENUM(
    'PENDING_MSA',
    'PENDING_COMPLIANCE',
    'ACTIVE',
    'SUSPENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."compliance_status" AS ENUM(
    'NOT_SUBMITTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."account_type" AS ENUM(
    'DIRECT',
    'RESELLER',
    'SUB_ACCOUNT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Step 2: Onboarding & Compliance Gateway Columns (MSA v1.0.0) ────────────

ALTER TABLE "customer_accounts"
  ADD COLUMN IF NOT EXISTS "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'PENDING_MSA',
  ADD COLUMN IF NOT EXISTS "activation_date" timestamp,
  ADD COLUMN IF NOT EXISTS "trial_end_date" timestamp,
  ADD COLUMN IF NOT EXISTS "msa_accepted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "msa_version" text,
  ADD COLUMN IF NOT EXISTS "compliance_status" "compliance_status" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "business_name" text,
  ADD COLUMN IF NOT EXISTS "ein" text,
  ADD COLUMN IF NOT EXISTS "physical_address" jsonb,
  ADD COLUMN IF NOT EXISTS "sms_use_case" text,
  ADD COLUMN IF NOT EXISTS "compliance_rejection_reason" text;

-- ─── Step 3: Reseller Franchise Hierarchy Columns (MSA v1.1.0 Addendum) ──────

ALTER TABLE "customer_accounts"
  ADD COLUMN IF NOT EXISTS "account_type" "account_type" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "parent_account_id" varchar,
  ADD COLUMN IF NOT EXISTS "wholesale_rate" numeric(10, 2) DEFAULT '49.00',
  ADD COLUMN IF NOT EXISTS "markup_rate" jsonb,
  ADD COLUMN IF NOT EXISTS "reseller_commission_balance" numeric(12, 2) DEFAULT '0.00',
  ADD COLUMN IF NOT EXISTS "stripe_connected_account_id" text,
  ADD COLUMN IF NOT EXISTS "reseller_msa_confirmed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "a2p_content_provider" jsonb;

-- ─── Step 4: Self-Referencing FK (parentAccountId → customerAccounts.id) ─────
-- Added only if the constraint does not already exist.

DO $$ BEGIN
  ALTER TABLE "customer_accounts"
    ADD CONSTRAINT "customer_accounts_parent_account_id_customer_accounts_id_fk"
    FOREIGN KEY ("parent_account_id")
    REFERENCES "customer_accounts"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
