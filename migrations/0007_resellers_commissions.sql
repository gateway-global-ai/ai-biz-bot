-- ============================================================================
-- 0007: Reseller Flywheel — multi-level hierarchy + commissions ledger
-- ============================================================================
-- Resellers table: self-referential hierarchy, commission rate, Stripe Connect
CREATE TABLE IF NOT EXISTS resellers (
  id                  varchar        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_reseller_id  varchar        REFERENCES resellers(id) ON DELETE SET NULL,
  stripe_account_id   text,                          -- Stripe Connect Express acct
  commission_rate     numeric(5, 4)  NOT NULL DEFAULT 0.10,  -- e.g. 0.10 = 10 %
  name                text,
  email               text,
  phone               text,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resellers_parent ON resellers (parent_reseller_id);

-- ── admin_users: link to reseller ───────────────────────────────────────────
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS reseller_id varchar REFERENCES resellers(id);

-- ── site_configs: link to reseller + nudge timestamp ────────────────────────
ALTER TABLE site_configs
  ADD COLUMN IF NOT EXISTS reseller_id        varchar REFERENCES resellers(id),
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at timestamptz;

-- ── reseller_commissions: one row per commission event ───────────────────────
-- Amounts stored in cents (integer) to avoid floating-point drift.
-- Status lifecycle: pending → paid | cancelled
-- Event types: subscription | top_up | manual
CREATE TABLE IF NOT EXISTS reseller_commissions (
  id                varchar      PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id       varchar      NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  site_config_id    varchar      REFERENCES site_configs(id) ON DELETE SET NULL,
  event_type        text         NOT NULL CHECK (event_type IN ('subscription', 'top_up', 'manual')),
  gross_amount_cents integer     NOT NULL,           -- revenue that triggered the commission
  commission_cents  integer      NOT NULL,           -- reseller's cut in cents
  status            text         NOT NULL DEFAULT 'pending'
                                          CHECK (status IN ('pending', 'paid', 'cancelled')),
  stripe_transfer_id text,                           -- filled once Stripe transfer fires
  note              text,                            -- optional operator note (manual events)
  created_at        timestamptz  NOT NULL DEFAULT now(),
  paid_at           timestamptz                      -- set when status → paid
);

CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller  ON reseller_commissions (reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_status    ON reseller_commissions (status);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_created   ON reseller_commissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_site      ON reseller_commissions (site_config_id);
