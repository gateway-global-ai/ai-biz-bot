-- ============================================================================
-- 0008: Site Claim Tokens — assign-to-phone + SMS invite + Stripe activation
-- ============================================================================
-- Adds claim lifecycle columns to site_configs so an admin/reseller can
-- assign a generated website to a business owner's phone number.
-- The owner receives an SMS, previews the site, then pays $49.99 to activate.

ALTER TABLE site_configs
  -- Secure random token embedded in the SMS claim link
  ADD COLUMN IF NOT EXISTS claim_token          varchar(64),
  -- Token expiry (default 7 days from assignment)
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  -- The phone number this invite was sent to
  ADD COLUMN IF NOT EXISTS assigned_to_phone    text,
  -- Lifecycle: unclaimed | invite_sent | payment_pending | claimed
  ADD COLUMN IF NOT EXISTS claim_status         text NOT NULL DEFAULT 'unclaimed',
  -- When the site was successfully claimed + payment confirmed
  ADD COLUMN IF NOT EXISTS claimed_at           timestamptz,
  -- Stripe Checkout session ID for the activation payment
  ADD COLUMN IF NOT EXISTS claim_checkout_session_id text;

-- Unique index so token lookups are O(1) and tokens cannot collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_configs_claim_token
  ON site_configs (claim_token)
  WHERE claim_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_configs_claim_status
  ON site_configs (claim_status);

CREATE INDEX IF NOT EXISTS idx_site_configs_assigned_phone
  ON site_configs (assigned_to_phone)
  WHERE assigned_to_phone IS NOT NULL;
