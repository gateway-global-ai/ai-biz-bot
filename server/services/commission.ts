/**
 * Reseller commission processing.
 * Called from Stripe webhook when a checkout completes (ENERGY_REFILL or platform subscription).
 */

import { db } from "../db";
import { resellerCommissions as commissions, siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";

const REFILL_COMMISSION_RATE = 0.1;
const PLATFORM_COMMISSION_DEFAULT = 15;

export interface StripeCheckoutSessionLike {
  id: string;
  amount_total: number | null;
  metadata?: Record<string, string> | null;
}

/**
 * Process commission for a completed Stripe Checkout session.
 * If the site has a reseller, inserts a PENDING_PAYOUT commission row.
 */
export async function processCommission(
  session: StripeCheckoutSessionLike,
  siteConfigId: string | null,
): Promise<void> {
  if (!siteConfigId) return;

  const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
  if (!site?.resellerId) return;

  const amountCents = session.amount_total ?? 0;
  const amountDollars = amountCents / 100;

  const meta = session.metadata ?? {};
  const isRefill = meta.type === "ENERGY_REFILL";

  const commissionDollars = isRefill
    ? Math.round(amountDollars * REFILL_COMMISSION_RATE * 100) / 100
    : PLATFORM_COMMISSION_DEFAULT;

  if (commissionDollars <= 0) return;

  await db.insert(commissions).values({
    resellerId: site.resellerId,
    siteConfigId,
    amount: String(amountDollars.toFixed(2)),
    commission: String(commissionDollars.toFixed(2)),
    type: isRefill ? "REFILL" : "PLATFORM",
    status: "PENDING_PAYOUT",
  });
}
