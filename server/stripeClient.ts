/**
 * server/stripeClient.ts
 *
 * Doppler-native Stripe client. Credentials sourced exclusively from
 * process.env.STRIPE_SECRET_KEY and process.env.STRIPE_PUBLISHABLE_KEY,
 * injected at runtime by `doppler run --`.
 *
 * Previous implementation fetched credentials from the Replit Connector
 * service (REPLIT_CONNECTORS_HOSTNAME + REPL_IDENTITY). That dependency
 * has been removed as part of the Zero-Leak Architecture migration.
 */

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
 * Map of internal plan keys → Stripe Price IDs (injected via Doppler).
 */
export const STRIPE_PRICE_IDS: Record<string, string> = {
  free:          process.env.STRIPE_PRICE_FREE         ?? 'price_1T3Dd8KSRGO5U0L03cdVeUTj',
  pro:           process.env.STRIPE_PRICE_STARTER      ?? 'price_1T3ELJKSRGO5U0L0P8o0chpB',
  voice:         process.env.STRIPE_PRICE_PRO          ?? 'price_1T3EMYKSRGO5U0L0hOp1cjxn',
  enterprise:    process.env.STRIPE_PRICE_ENTERPRISE   ?? 'price_1T3EOOKSRGO5U0L0sdCDoO25',
  energy_500:    process.env.STRIPE_PRICE_ENERGY_500   ?? '',
  energy_1200:   process.env.STRIPE_PRICE_ENERGY_1200  ?? '',
};

// Backwards-compatible alias used by existing routes
export async function getUncachableStripeClient(): Promise<Stripe> {
  return getStripeClient();
}

export async function getStripePublishableKeyAsync(): Promise<string> {
  return getStripePublishableKey();}

// getStripeSync removed — stripe-replit-sync was a Replit-only package
