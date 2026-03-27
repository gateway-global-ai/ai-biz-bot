/**
 * energy-monitor.ts
 *
 * The "Energy Pool" billing engine.
 *
 * Rules (as per product spec):
 *   - Voice (web + phone): 1 minute = 1 credit = $0.10
 *   - All durations are rounded UP to the nearest whole minute
 *     (standard industry practice).
 *
 * This service is the single source of truth for:
 *   1. Computing billed minutes from raw seconds.
 *   2. Persisting a voice_usage_log row for every completed call.
 *   3. Decrementing voice_phone_ai_minutes / voice_web_ai_minutes (granular ledger).
 *   4. Providing a balance-check guard used by voice webhooks.
 */

import { db } from "../db";
import { voiceUsageLogs, siteConfigs } from "@shared/schema";
import { eq, desc, sum } from "drizzle-orm";
import type { InsertVoiceUsageLog, VoiceUsageLog } from "@shared/schema";

/** Rate in cents per billed minute (default $0.10). */
export const RATE_PER_MINUTE_CENTS = 10;

/**
 * Round a raw call duration (seconds) UP to the nearest whole minute.
 * Any non-positive value is treated as 0 billed minutes.
 */
export function roundUpToMinute(rawSeconds: number): number {
  if (rawSeconds <= 0) return 0;
  return Math.ceil(rawSeconds / 60);
}

export interface LogVoiceUsageParams {
  siteConfigId: string;
  callSid?: string;
  callType?: "phone" | "web";
  rawDurationSeconds: number;
  ratePerMinuteCents?: number;
}

export interface LogVoiceUsageResult {
  log: VoiceUsageLog;
  billedMinutes: number;
  billedAmountCents: number;
  newBalance: number | null;
}

/**
 * Record a completed voice call, compute billed minutes + amount, and
 * decrement the site's minute_balance (if one is set).
 *
 * Returns the persisted log row plus the updated balance.
 */
export async function logVoiceUsage(
  params: LogVoiceUsageParams,
): Promise<LogVoiceUsageResult> {
  const {
    siteConfigId,
    callSid,
    callType = "phone",
    rawDurationSeconds,
    ratePerMinuteCents = RATE_PER_MINUTE_CENTS,
  } = params;

  const billedMinutes = roundUpToMinute(rawDurationSeconds);
  const billedAmountCents = billedMinutes * ratePerMinuteCents;

  const insertPayload: InsertVoiceUsageLog = {
    siteConfigId,
    callSid: callSid ?? null,
    callType,
    rawDurationSeconds,
    billedMinutes,
    ratePerMinuteCents,
    billedAmountCents,
  };

  const [log] = await db
    .insert(voiceUsageLogs)
    .values(insertPayload)
    .returning();

  // Decrement granular voice pools (minute_balance column was removed in migration 0009).
  let newBalance: number | null = null;
  if (billedMinutes > 0) {
    const [site] = await db
      .select({
        voicePhoneAiMinutes: siteConfigs.voicePhoneAiMinutes,
        voiceWebAiMinutes: siteConfigs.voiceWebAiMinutes,
      })
      .from(siteConfigs)
      .where(eq(siteConfigs.id, siteConfigId));

    if (site) {
      const pool = callType === "web" ? site.voiceWebAiMinutes : site.voicePhoneAiMinutes;
      const next = Math.max(0, pool - billedMinutes);
      newBalance = next;
      await db
        .update(siteConfigs)
        .set(
          callType === "web"
            ? { voiceWebAiMinutes: next }
            : { voicePhoneAiMinutes: next },
        )
        .where(eq(siteConfigs.id, siteConfigId));
      // Non-blocking: nudge owner if balance is low (once per site until refill).
      import("./energyAlerts").then((m) => m.checkEnergyAndNudge(siteConfigId)).catch(() => {});
    }
  }

  return { log, billedMinutes, billedAmountCents, newBalance };
}

/**
 * Returns true if the site has prepaid PSTN (phone) AI minutes available.
 * WebRTC balance is tracked separately in voice_web_ai_minutes.
 */
export async function hasEnergyBalance(siteConfigId: string): Promise<boolean> {
  const [site] = await db
    .select({ voicePhoneAiMinutes: siteConfigs.voicePhoneAiMinutes })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId));

  if (!site) return false;
  return site.voicePhoneAiMinutes > 0;
}

/**
 * Retrieve the current energy balance summary for a site.
 */
export async function getEnergyBalance(siteConfigId: string): Promise<{
  minuteBalance: number | null;
  totalBilledMinutes: number;
  totalBilledAmountCents: number;
}> {
  const [site] = await db
    .select({
      voicePhoneAiMinutes: siteConfigs.voicePhoneAiMinutes,
      voiceWebAiMinutes: siteConfigs.voiceWebAiMinutes,
    })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId));

  const [totals] = await db
    .select({
      totalMinutes: sum(voiceUsageLogs.billedMinutes),
      totalCents: sum(voiceUsageLogs.billedAmountCents),
    })
    .from(voiceUsageLogs)
    .where(eq(voiceUsageLogs.siteConfigId, siteConfigId));

  const phone = site?.voicePhoneAiMinutes ?? 0;
  const web = site?.voiceWebAiMinutes ?? 0;
  return {
    minuteBalance: phone + web,
    totalBilledMinutes: Number(totals?.totalMinutes ?? 0),
    totalBilledAmountCents: Number(totals?.totalCents ?? 0),
  };
}

/**
 * Fetch recent voice usage logs for a site (newest first).
 */
export async function getVoiceUsageLogs(
  siteConfigId: string,
  limit = 50,
): Promise<VoiceUsageLog[]> {
  return db
    .select()
    .from(voiceUsageLogs)
    .where(eq(voiceUsageLogs.siteConfigId, siteConfigId))
    .orderBy(desc(voiceUsageLogs.createdAt))
    .limit(limit);
}
