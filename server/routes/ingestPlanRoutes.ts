/**
 * ingestPlanRoutes.ts
 * POST /api/ingest-plan
 * Accepts a raw "Website Plan" text, parses it via Gemini into structured
 * Sovereign Intelligence, and merges the result into site_configs.knowledgeLibrary.
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { parseWebsitePlan } from "../services/parsePlanService";
import { requireAuth } from "../auth";
import { db } from "../db";
import { siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const ingestSchema = z.object({
  /** Direct siteConfig UUID (preferred when calling from MyAccount) */
  siteConfigId: z.string().uuid().optional(),
  /** Platform UUID from platform_business_map (alternative lookup) */
  platformId: z.string().uuid().optional(),
  /** The raw plan text (max 50 000 chars) */
  planText: z.string().min(50, "planText is too short").max(50_000, "planText is too long"),
}).refine((d) => d.siteConfigId || d.platformId, {
  message: "Either siteConfigId or platformId is required.",
});

router.post("/api/ingest-plan", requireAuth, async (req: any, res) => {
  try {
    // 1. Validate input
    const parse = ingestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { platformId, planText } = parse.data;

    // 2. Resolve siteConfigId — accept direct siteConfigId or look up via platformId
    let siteConfigId: string | null = parse.data.siteConfigId ?? null;
    if (!siteConfigId && platformId) {
      siteConfigId = await storage.getSiteConfigIdByPlatformId(platformId);
    }
    if (!siteConfigId) {
      return res.status(404).json({ error: "Platform not found." });
    }

    // 3. Ownership check — the logged-in admin must own this site
    //    (Admin-level session: adminUserId is set; owner sessions: customerAccountId)
    const session = req.session as { adminUserId?: string };
    if (!session?.adminUserId) {
      // Fallback: check customer ownership
      const site = await storage.getSiteConfig(siteConfigId);
      const customerSession = req.session as { customerAccountId?: string };
      if (!customerSession?.customerAccountId) {
        return res.status(401).json({ error: "Authentication required." });
      }
      if (site?.ownerId !== customerSession.customerAccountId) {
        return res.status(403).json({ error: "You do not own this platform." });
      }
    }

    // 4. Parse the plan via Gemini
    let parsed;
    try {
      parsed = await parseWebsitePlan(planText);
    } catch (err: any) {
      console.error("[IngestPlan] Gemini parse error:", err.message);
      return res.status(502).json({ error: "AI parsing failed. Please try again.", detail: err.message });
    }

    // 5. Merge into the existing knowledgeLibrary (non-destructive deep merge)
    const existing = await storage.getSiteConfig(siteConfigId);
    const existingLib = (existing?.knowledgeLibrary as Record<string, any>) ?? {};
    const merged = {
      ...existingLib,
      sovereignIdentity: { ...(existingLib.sovereignIdentity ?? {}), ...parsed.sovereignIdentity },
      sovereignTruths:   [...(existingLib.sovereignTruths ?? []),   ...parsed.sovereignTruths],
      operationalData:   { ...(existingLib.operationalData ?? {}), ...parsed.operationalData },
      requiredTools:     mergeTools(existingLib.requiredTools ?? [], parsed.requiredTools),
      _ingestedAt:       new Date().toISOString(),
    };

    await db
      .update(siteConfigs)
      .set({ knowledgeLibrary: merged })
      .where(eq(siteConfigs.id, siteConfigId));

    return res.json({
      success: true,
      siteConfigId,
      summary: {
        businessName: parsed.sovereignIdentity.businessName,
        sovereignTruthsCount: parsed.sovereignTruths.length,
        toolsIdentified:      parsed.requiredTools.map((t) => t.toolName),
        operationalKeys:      Object.keys(parsed.operationalData),
      },
      parsed,
    });

  } catch (err: any) {
    console.error("[IngestPlan] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/** Merge tool arrays de-duplicated by toolName (new entries win) */
function mergeTools(
  existing: Array<{ toolName: string; [k: string]: any }>,
  incoming: Array<{ toolName: string; [k: string]: any }>,
) {
  const map = new Map(existing.map((t) => [t.toolName, t]));
  for (const t of incoming) map.set(t.toolName, t);
  return [...map.values()];
}

export default router;
