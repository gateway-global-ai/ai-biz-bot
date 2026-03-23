/**
 * Admin — Knowledge gap analysis (v1 heuristic).
 * GET /api/v1/admin/knowledge-gap — list sites with at-risk summary
 * GET /api/v1/admin/knowledge-gap/:siteConfigId — full report for one site
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  analyzeAllSitesForGapSummary,
  analyzeKnowledgeGapForSite,
} from "../services/knowledgeGapAnalysis";
import { firstRouteParam } from "../utils/expressParams";

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
    res.status(403).json({ error: "Knowledge gap reports require admin access." });
    return;
  }
  next();
}

router.get(
  "/api/v1/admin/knowledge-gap",
  requireAuth,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const siteIdRaw = req.query.siteConfigId;
      const siteConfigId =
        typeof siteIdRaw === "string" && siteIdRaw.length > 0 ? siteIdRaw : undefined;

      if (siteConfigId) {
        const report = await analyzeKnowledgeGapForSite(siteConfigId);
        if (!report) {
          res.status(404).json({ error: "Site not found" });
          return;
        }
        res.json({ ok: true, report });
        return;
      }

      const summary = await analyzeAllSitesForGapSummary();
      const atRisk = summary.filter((s) => s.atRisk);
      res.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        totalSites: summary.length,
        atRiskCount: atRisk.length,
        sites: summary,
        atRiskSites: atRisk,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Knowledge gap analysis failed";
      res.status(500).json({ error: msg });
    }
  }
);

router.get(
  "/api/v1/admin/knowledge-gap/:siteConfigId",
  requireAuth,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId);
      if (!siteConfigId) {
        res.status(400).json({ error: "Missing siteConfigId" });
        return;
      }
      const report = await analyzeKnowledgeGapForSite(siteConfigId);
      if (!report) {
        res.status(404).json({ error: "Site not found" });
        return;
      }
      res.json({ ok: true, report });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Knowledge gap analysis failed";
      res.status(500).json({ error: msg });
    }
  }
);

export default router;
