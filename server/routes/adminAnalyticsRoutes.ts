/**
 * Admin analytics — read-only aggregates for platform observability.
 * GET /api/v1/admin/analytics/voice-activation
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { getVoiceActivationStats } from "../services/voiceActivationAnalytics";

const router = Router();

const PLATFORM_ROLES = new Set(["admin", "superadmin", "owner"]);

async function requirePlatformAnalytics(req: Request, res: Response, next: () => void) {
  const session = (req as any).session as { adminUserId?: string } | undefined;
  const adminUserId = session?.adminUserId;
  if (!adminUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await storage.getAdminUserById(adminUserId);
  if (!user?.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  if (!PLATFORM_ROLES.has(user.role || "")) {
    res.status(403).json({ error: "Platform analytics requires admin access." });
    return;
  }
  next();
}

router.get(
  "/api/v1/admin/analytics/voice-activation",
  requireAuth,
  requirePlatformAnalytics,
  async (req: Request, res: Response) => {
    try {
      const daysRaw = req.query.days;
      const days =
        typeof daysRaw === "string" && daysRaw.length > 0
          ? parseInt(daysRaw, 10)
          : 7;
      const siteIdRaw = req.query.siteConfigId;
      const siteConfigId =
        typeof siteIdRaw === "string" && siteIdRaw.length > 0 ? siteIdRaw : undefined;

      const series = await getVoiceActivationStats({
        days: Number.isFinite(days) ? days : 7,
        siteConfigId,
      });

      const total = series.reduce((s, r) => s + r.count, 0);

      res.json({
        ok: true,
        days: Number.isFinite(days) ? Math.min(90, Math.max(1, days)) : 7,
        siteConfigId: siteConfigId ?? null,
        total,
        series,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load voice activation stats";
      res.status(500).json({ error: msg });
    }
  },
);

export default router;
