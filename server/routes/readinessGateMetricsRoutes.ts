/**
 * Platform admin — in-process readiness_gate_v1 counters (resets on deploy).
 * GET /api/v1/admin/readiness-gate-v1/metrics
 */
import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { getReadinessGateV1MetricsSnapshot } from "../services/readinessGateV1Metrics";

const router = Router();

const PLATFORM_ROLES = new Set(["admin", "superadmin", "owner"]);

async function requirePlatformAdmin(req: Request, res: Response, next: () => void) {
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
    res.status(403).json({ error: "Platform admin access required." });
    return;
  }
  next();
}

router.get(
  "/api/v1/admin/readiness-gate-v1/metrics",
  requireAuth,
  requirePlatformAdmin,
  (_req: Request, res: Response) => {
    try {
      res.json({ ok: true, ...getReadinessGateV1MetricsSnapshot() });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load metrics";
      res.status(500).json({ error: msg });
    }
  },
);

export default router;
