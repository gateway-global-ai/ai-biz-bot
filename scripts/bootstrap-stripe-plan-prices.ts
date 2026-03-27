/**
 * Create Stripe Products/Prices for site billing keys in server/stripeClient.ts
 * and print Doppler-ready STRIPE_PRICE_* lines (no secrets committed).
 *
 * Run: doppler run -- npx tsx scripts/bootstrap-stripe-plan-prices.ts
 * Apply: doppler run -- npx tsx scripts/bootstrap-stripe-plan-prices.ts --apply
 * Live:  add --allow-live when using sk_live_secret (guardrail)
 *
 * Idempotency: products are tagged with metadata aibizbot_bootstrap_key=<logicalKey>.
 */

import Stripe from "stripe";

const API_VERSION = "2025-11-17.clover" as const;

type BootstrapKey =
  | "free"
  | "pro"
  | "voice"
  | "enterprise"
  | "energy_500"
  | "energy_1200"
  | "claim_activation"
  | "affiliate_starter_kit";

/** Env var name in Doppler → stripeClient mapping */
const ENV_BY_KEY: Record<BootstrapKey, string> = {
  free: "STRIPE_PRICE_FREE",
  pro: "STRIPE_PRICE_STARTER",
  voice: "STRIPE_PRICE_PRO",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
  energy_500: "STRIPE_PRICE_ENERGY_500",
  energy_1200: "STRIPE_PRICE_ENERGY_1200",
  claim_activation: "STRIPE_PRICE_CLAIM_ACTIVATION",
  affiliate_starter_kit: "STRIPE_PRICE_AFFILIATE_STARTER_KIT",
};

/** Default unit amounts (USD cents). Adjust in Stripe Dashboard after creation if needed. */
const DEFAULT_AMOUNTS: Record<
  BootstrapKey,
  { unit_amount: number; recurring: boolean; interval?: Stripe.Price.Recurring.Interval }
> = {
  free: { unit_amount: 0, recurring: true, interval: "month" },
  pro: { unit_amount: 4900, recurring: true, interval: "month" },
  voice: { unit_amount: 9900, recurring: true, interval: "month" },
  enterprise: { unit_amount: 29900, recurring: true, interval: "month" },
  energy_500: { unit_amount: 5000, recurring: false },
  energy_1200: { unit_amount: 12000, recurring: false },
  claim_activation: { unit_amount: 4999, recurring: false },
  affiliate_starter_kit: { unit_amount: 9900, recurring: false },
};

const DISPLAY_NAME: Record<BootstrapKey, string> = {
  free: "Gateway AI — Free",
  pro: "Gateway AI — Pro",
  voice: "Gateway AI — Voice",
  enterprise: "Gateway AI — Enterprise",
  energy_500: "AI Energy — 500 min",
  energy_1200: "AI Energy — 1200 min",
  claim_activation: "Site claim activation",
  affiliate_starter_kit: "Affiliate starter kit",
};

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    apply: argv.includes("--apply"),
    allowLive: argv.includes("--allow-live"),
  };
}

async function findProductByBootstrapKey(
  stripe: Stripe,
  bootstrapKey: string,
): Promise<Stripe.Product | null> {
  let startingAfter: string | undefined;
  for (;;) {
    const list = await stripe.products.list({ limit: 100, starting_after: startingAfter });
    const found = list.data.find((p) => p.metadata?.aibizbot_bootstrap_key === bootstrapKey);
    if (found) return found;
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1]!.id;
  }
  return null;
}

async function getActivePriceForProduct(
  stripe: Stripe,
  productId: string,
  recurring: boolean,
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const match = prices.data.find((pr) =>
    recurring ? pr.type === "recurring" : pr.type === "one_time",
  );
  return match ?? null;
}

async function ensurePrice(
  stripe: Stripe,
  key: BootstrapKey,
  apply: boolean,
): Promise<{ priceId: string; created: boolean } | { error: string }> {
  const spec = DEFAULT_AMOUNTS[key];
  const envVar = ENV_BY_KEY[key];
  const existing = await findProductByBootstrapKey(stripe, key);
  if (existing) {
    const pr = await getActivePriceForProduct(stripe, existing.id, spec.recurring);
    if (pr) {
      return { priceId: pr.id, created: false };
    }
    if (!apply) {
      return { error: `Product ${existing.id} exists but no matching ${spec.recurring ? "recurring" : "one_time"} price; use --apply to create price` };
    }
    const created = await stripe.prices.create({
      product: existing.id,
      currency: "usd",
      unit_amount: spec.unit_amount,
      ...(spec.recurring
        ? { recurring: { interval: spec.interval ?? "month" } }
        : {}),
    });
    return { priceId: created.id, created: true };
  }

  if (!apply) {
    return { error: "dry-run: would create product + price" };
  }

  const product = await stripe.products.create({
    name: DISPLAY_NAME[key],
    metadata: { aibizbot_bootstrap_key: key },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: spec.unit_amount,
    ...(spec.recurring ? { recurring: { interval: spec.interval ?? "month" } } : {}),
  });
  return { priceId: price.id, created: true };
}

async function main() {
  const { apply, allowLive } = parseArgs();
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("STRIPE_SECRET_KEY is not set. Use: doppler run -- npx tsx scripts/bootstrap-stripe-plan-prices.ts");
    process.exit(1);
  }

  const isLive = secret.startsWith("sk_live");
  if (isLive && apply && !allowLive) {
    console.error(
      "Refusing --apply with a live secret key. Pass --allow-live if you intend to create catalog objects in live mode.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(secret, { apiVersion: API_VERSION });

  const keys = Object.keys(ENV_BY_KEY) as BootstrapKey[];
  console.log(
    `Stripe bootstrap (${isLive ? "LIVE" : "test"} mode) — ${apply ? "APPLY" : "dry-run"}\n`,
  );

  const dopplerLines: string[] = [];
  const keysOrder: BootstrapKey[] = [
    "free",
    "pro",
    "voice",
    "enterprise",
    "energy_500",
    "energy_1200",
    "claim_activation",
    "affiliate_starter_kit",
  ];

  for (const key of keysOrder) {
    const envVar = ENV_BY_KEY[key];
    const spec = DEFAULT_AMOUNTS[key];
    try {
      const result = await ensurePrice(stripe, key, apply);
      if ("error" in result) {
        if (apply === false && result.error.includes("dry-run")) {
          console.log(`[${key}] ${result.error} (${envVar}=${spec.unit_amount}¢ ${spec.recurring ? "recurring" : "one_time"})`);
          dopplerLines.push(`${envVar}=price_...`);
          continue;
        }
        console.warn(`[${key}] ${result.error}`);
        dopplerLines.push(`${envVar}=`);
        continue;
      }
      console.log(
        `[${key}] ${result.created ? "created" : "existing"} price ${result.priceId} → ${envVar}`,
      );
      dopplerLines.push(`${envVar}=${result.priceId}`);
    } catch (e: any) {
      console.error(`[${key}] Stripe error:`, e?.message ?? e);
      dopplerLines.push(`${envVar}=`);
    }
  }

  console.log("\n# --- Paste into Doppler (same config as STRIPE_SECRET_KEY) ---\n");
  console.log(dopplerLines.join("\n"));
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
