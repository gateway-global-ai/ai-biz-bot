/**
 * Platform metrics for admin dashboard: accounts by type, revenue, voice usage, Twilio usage.
 * Environment status: dev/stg/prd domain reachability.
 * GET /api/admin/platform-metrics
 * GET /api/admin/environment-status
 */
import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { siteConfigs, voiceUsageLogs } from "@shared/schema";
import { sql, gte, desc, eq } from "drizzle-orm";
import { getTwilioClient } from "../twilio";
import axios from "axios";

const router = Router();

/** Dev, Stage, Prod — match environment-management skill and deploy scripts. */
const ENVIRONMENT_URLS: { env: string; label: string; url: string }[] = [
  { env: "dev", label: "Dev", url: "https://aibizbot-dev.gatewayglobal.ai" },
  { env: "stg", label: "Stage", url: "https://aibizbot-stage.gatewayglobal.ai" },
  { env: "prd", label: "Prod", url: "https://aibizbot.gatewayglobal.ai" },
];

const HEALTH_PATH = "/api/health";
const PING_TIMEOUT_MS = 12_000;

/**
 * GET /api/admin/environment-status
 * Pings each of dev/stg/prd /api/health and returns status, statusCode, responseTimeMs.
 */
router.get("/api/admin/environment-status", async (_req: Request, res: Response) => {
  try {
    const results = await Promise.all(
      ENVIRONMENT_URLS.map(async ({ env, label, url }) => {
        const fullUrl = `${url}${HEALTH_PATH}`;
        const start = Date.now();
        try {
          const response = await axios.get(fullUrl, {
            timeout: PING_TIMEOUT_MS,
            validateStatus: () => true,
          });
          const responseTimeMs = Date.now() - start;
          const online = response.status >= 200 && response.status < 400;
          return {
            env,
            label,
            url,
            status: online ? "online" : "degraded",
            statusCode: response.status,
            responseTimeMs,
            error: online ? undefined : `HTTP ${response.status}`,
          };
        } catch (err: any) {
          const responseTimeMs = Date.now() - start;
          const message = err.code === "ECONNABORTED" ? "Timeout" : err.message ?? "Request failed";
          return {
            env,
            label,
            url,
            status: "offline",
            statusCode: null,
            responseTimeMs,
            error: message,
          };
        }
      })
    );
    res.json({ domains: results, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Failed to check environment status" });
  }
});

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function startOfYear(d: Date): Date {
  const x = new Date(d);
  x.setUTCMonth(0, 1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * GET /api/admin/platform-metrics
 * Returns: accounts (total + by plan), revenue (voice AI cents), voice usage (minutes), Twilio usage (MTD).
 */
router.get("/api/admin/platform-metrics", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    // Accounts: count site_configs by plan and total
    const sites = await db.select({ plan: siteConfigs.plan }).from(siteConfigs);
    const byPlan: Record<string, number> = { free: 0, pro: 0, voice: 0, enterprise: 0 };
    for (const s of sites) {
      const p = (s.plan ?? "free") as string;
      if (p in byPlan) byPlan[p]++;
      else byPlan[p] = (byPlan[p] ?? 0) + 1;
    }

    // Voice usage logs: revenue (cents) and minutes for today, MTD, YTD
    const [todayRevenue] = await db
      .select({
        cents: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedAmountCents}), 0)::int`,
        minutes: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedMinutes}), 0)::int`,
      })
      .from(voiceUsageLogs)
      .where(gte(voiceUsageLogs.createdAt, todayStart));

    const [mtdRevenue] = await db
      .select({
        cents: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedAmountCents}), 0)::int`,
        minutes: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedMinutes}), 0)::int`,
      })
      .from(voiceUsageLogs)
      .where(gte(voiceUsageLogs.createdAt, monthStart));

    const [ytdRevenue] = await db
      .select({
        cents: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedAmountCents}), 0)::int`,
        minutes: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedMinutes}), 0)::int`,
      })
      .from(voiceUsageLogs)
      .where(gte(voiceUsageLogs.createdAt, yearStart));

    // Twilio usage this month (calls, sms, cost)
    let twilioUsage: { calls: number; sms: number; totalCostUsd: string } = {
      calls: 0,
      sms: 0,
      totalCostUsd: "0.00",
    };
    try {
      const client = await getTwilioClient();
      const usageRecords = await client.usage.records.thisMonth.list({ limit: 100 });
      let callCount = 0;
      let smsCount = 0;
      let totalCost = 0;
      for (const record of usageRecords) {
        const count = parseInt(record.count ?? "0", 10) || 0;
        const price = parseFloat(record.price ?? "0") || 0;
        if (record.category === "calls") {
          callCount += count;
          totalCost += price;
        } else if (record.category === "sms") {
          smsCount += count;
          totalCost += price;
        }
      }
      twilioUsage = {
        calls: callCount,
        sms: smsCount,
        totalCostUsd: totalCost.toFixed(2),
      };
    } catch (_e) {
      // Twilio not configured or error; leave zeros
    }

    res.json({
      accounts: {
        total: sites.length,
        byPlan,
      },
      revenue: {
        todayCents: Number(todayRevenue?.cents ?? 0),
        mtdCents: Number(mtdRevenue?.cents ?? 0),
        ytdCents: Number(ytdRevenue?.cents ?? 0),
      },
      voiceUsage: {
        todayMinutes: Number(todayRevenue?.minutes ?? 0),
        mtdMinutes: Number(mtdRevenue?.minutes ?? 0),
        ytdMinutes: Number(ytdRevenue?.minutes ?? 0),
      },
      twilioUsage,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Failed to load platform metrics" });
  }
});

/**
 * GET /api/admin/last-voice-usage
 * Returns the single most recent voice usage log (last call) platform-wide.
 * Use this to see last call duration and cost. Note: the app bills by voice minutes
 * ($0.10/min), not by AI/LLM tokens — token counts are not stored per call.
 */
router.get("/api/admin/last-voice-usage", async (_req: Request, res: Response) => {
  try {
    const [log] = await db
      .select({
        id: voiceUsageLogs.id,
        siteConfigId: voiceUsageLogs.siteConfigId,
        callSid: voiceUsageLogs.callSid,
        callType: voiceUsageLogs.callType,
        rawDurationSeconds: voiceUsageLogs.rawDurationSeconds,
        billedMinutes: voiceUsageLogs.billedMinutes,
        ratePerMinuteCents: voiceUsageLogs.ratePerMinuteCents,
        billedAmountCents: voiceUsageLogs.billedAmountCents,
        createdAt: voiceUsageLogs.createdAt,
        siteName: siteConfigs.name,
      })
      .from(voiceUsageLogs)
      .leftJoin(siteConfigs, eq(voiceUsageLogs.siteConfigId, siteConfigs.id))
      .orderBy(desc(voiceUsageLogs.createdAt))
      .limit(1);

    if (!log) {
      return res.json({ lastCall: null, message: "No voice usage logged yet." });
    }

    res.json({
      lastCall: {
        ...log,
        costUsd: (log.billedAmountCents / 100).toFixed(2),
        durationFormatted: `${log.rawDurationSeconds}s (${log.billedMinutes} billed min)`,
      },
      note: "Billing is by voice minutes ($0.10/min). AI token counts are not stored per call.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Failed to load last voice usage" });
  }
});

export default router;
