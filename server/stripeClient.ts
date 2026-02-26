import Stripe from 'stripe';

/**
 * Returns a Stripe client initialised from STRIPE_SECRET_KEY in Doppler.
 * Throws clearly if the key is missing so misconfiguration is obvious in logs.
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY is not set — add it to Doppler dev config.');
  }
  return new Stripe(key, { apiVersion: '2025-11-17.clover' });
}

export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? '';
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? '';
}

/**
 * Unified map of internal plan keys + energy refill keys → Stripe Price IDs.
 * All values injected via Doppler at runtime; falls back to '' for energy keys
 * so the server boots cleanly before Doppler variables are set.
 * Set STRIPE_PRICE_ENERGY_500 and STRIPE_PRICE_ENERGY_1200 in Doppler once
 * the one-time Price objects have been created in the Stripe dashboard.
 */
export const STRIPE_PRICE_IDS: Record<string, string> = {
  // ── Subscription plans ──────────────────────────────────────────────────────
  free:       process.env.STRIPE_PRICE_FREE       ?? 'price_1T3Dd8KSRGO5U0L03cdVeUTj',
  pro:        process.env.STRIPE_PRICE_STARTER    ?? 'price_1T3ELJKSRGO5U0L0P8o0chpB',
  voice:      process.env.STRIPE_PRICE_PRO        ?? 'price_1T3EMYKSRGO5U0L0hOp1cjxn',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? 'price_1T3EOOKSRGO5U0L0sdCDoO25',
  // ── Phase 3: Partner Energy refill (one-time payments) ─────────────────────
  // Create one-time Price objects in Stripe dashboard, then set in Doppler.
  energy_500:  process.env.STRIPE_PRICE_ENERGY_500  ?? '',
  energy_1200: process.env.STRIPE_PRICE_ENERGY_1200 ?? '',
  // ── Site Claim Activation ($49.99 one-time) ─────────────────────────────────
  // One-time Price for new business owners to activate their assigned website.
  // Create a one-time Price at $49.99 in Stripe, then set in Doppler.
  claim_activation: process.env.STRIPE_PRICE_CLAIM_ACTIVATION ?? '',
};

/**
 * Convenience alias for energy refill lookups keyed by package type.
 * Kept as a separate export for backwards-compatibility with existing refill routes.
 */
export const STRIPE_ENERGY_PRICE_IDS: Record<string, string> = {
  basic: STRIPE_PRICE_IDS.energy_500,
  pro:   STRIPE_PRICE_IDS.energy_1200,
};

// Backwards-compatible alias used by existing routes
export async function getUncachableStripeClient(): Promise<Stripe> {
  return getStripeClient();
}

export async function getStripePublishableKeyAsync(): Promise<string> {
  return getStripePublishableKey();
}

// getStripeSync removed — stripe-replit-sync was a Replit-only package
