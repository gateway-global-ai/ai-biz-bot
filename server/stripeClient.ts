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

import Stripe from "stripe";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[StripeClient] Required environment variable "${key}" is not set. ` +
      `Ensure it is configured in Doppler and the process was started with "doppler run --".`
    );
  }
  return value;
}

/**
 * Returns a fresh Stripe client on every call (uncachable) so that
 * key rotation in Doppler takes effect without a process restart.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-11-17.clover",
  });
}

export async function getStripePublishableKey(): Promise<string> {
  return requireEnv("STRIPE_PUBLISHABLE_KEY");
}

export async function getStripeSecretKey(): Promise<string> {
  return requireEnv("STRIPE_SECRET_KEY");
}

/**
 * getStripeSync — PENDING MIGRATION.
 * The previous implementation used `stripe-replit-sync` which is a
 * Replit-platform-specific package. This function is not currently used
 * in any active billing flow. It will be replaced with a Stripe Connect
 * webhook sync implementation once the Stripe Dashboard is configured
 * per TODO_STRIPE.md.
 */
export async function getStripeSync(): Promise<never> {
  throw new Error(
    "[StripeClient] getStripeSync() is not yet implemented in the Doppler environment. " +
    "See TODO_STRIPE.md — 'Stripe Connect / Sync Migration' for the implementation roadmap."
  );
}
