/**
 * Weekly Reseller Payouts – Friday midnight.
 * Transfers PENDING_PAYOUT commissions to resellers' Stripe Connect Express accounts.
 */

import cron from "node-cron";
import { db } from "../db";
import { resellerCommissions as commissions, resellers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function executeWeeklyPayouts(): Promise<void> {
  console.log("[Cron] Starting Weekly Reseller Payouts...");

  const { getStripeClient } = await import("../stripeClient");
  const stripe = getStripeClient();

  const pending = await db.select().from(commissions).where(eq(commissions.status, "PENDING_PAYOUT"));

  for (const commission of pending) {
    const [reseller] = await db.select().from(resellers).where(eq(resellers.id, commission.resellerId));
    if (!reseller?.stripeConnectId) {
      console.warn(`[Cron] Skipping commission ${commission.id}: reseller ${commission.resellerId} has no Stripe Connect ID`);
      continue;
    }

    try {
      const amountCents = Math.round(Number(commission.commission) * 100);
      if (amountCents <= 0) {
        console.warn(`[Cron] Skipping commission ${commission.id}: non-positive amount`);
        continue;
      }

      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: "usd",
        destination: reseller.stripeConnectId,
        metadata: { commissionId: commission.id },
      });

      await db
        .update(commissions)
        .set({ status: "PAID", stripeTransferId: transfer.id })
        .where(eq(commissions.id, commission.id));

      console.log(`[Cron] Paid commission ${commission.id} → reseller ${reseller.id}: $${(amountCents / 100).toFixed(2)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Cron] Payout failed for commission ${commission.id} (reseller ${reseller.id}):`, message);
    }
  }

  console.log("[Cron] Weekly Reseller Payouts finished.");
}

export function initPayoutCron(): void {
  cron.schedule("0 0 * * 5", () => {
    executeWeeklyPayouts().catch((err) => console.error("[Cron] Payout job error:", err));
  });
  console.log("[Cron] Weekly payout job scheduled (Friday 00:00).");
}

export { executeWeeklyPayouts };
