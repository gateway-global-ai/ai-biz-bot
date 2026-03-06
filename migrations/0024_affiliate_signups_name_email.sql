-- Affiliate signups: optional name and email for registration + Stripe checkout
ALTER TABLE affiliate_signups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE affiliate_signups ADD COLUMN IF NOT EXISTS email TEXT;
