/**
 * Energy low nudge: SMS the site owner when prepaid balance drops to or below 50 minutes.
 * Only sends once per site until refill (lastNudgeSentAt is reset on ENERGY_REFILL).
 */

import { storage } from "../storage";
import { getEnergyBalance } from "./energy-monitor";
import { sendSms, getTwilioFromPhoneNumber } from "../twilio";

const LOW_THRESHOLD = 50;

export async function checkEnergyAndNudge(siteConfigId: string): Promise<void> {
  try {
    const site = await storage.getSiteConfigById(siteConfigId);
    if (!site) return;
    if (site.lastNudgeSentAt != null) return;

    const balance = await getEnergyBalance(siteConfigId);
    if (balance.minuteBalance === null || balance.minuteBalance > LOW_THRESHOLD) return;

    const ownerId = (site as any).ownerId;
    if (!ownerId) return;

    const owner = await storage.getCustomerAccountById(ownerId);
    const phone = owner?.phone;
    if (!phone) return;

    const fromNumber = await getTwilioFromPhoneNumber();
    if (!fromNumber) return;

    const appUrl = process.env.APP_URL || "https://aibizbot.gatewayglobal.ai";
    const refillUrl = `${appUrl}/billing`;
    const businessName = site.name || "Your business";

    await sendSms(
      phone,
      `${businessName}: Your AI is low on energy (${balance.minuteBalance} min left). Top up so callers aren’t turned away: ${refillUrl}`,
      fromNumber
    );

    await storage.updateSiteConfig(siteConfigId, { lastNudgeSentAt: new Date() } as any);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[EnergyAlerts] checkEnergyAndNudge failed:", message);
  }
}
