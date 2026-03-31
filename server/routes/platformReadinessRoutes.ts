/**
 * Platform readiness — same JSON as `npm run system:check -- --json`.
 * Mounted at /api/platform
 *
 * GET /readiness — Bearer session (`requireAuth`); no Gemini permit.
 *
 * @see docs-governance/canonical/SYSTEM_READINESS_CHECK_V1.md
 */
import { Router } from "express";
import { requireAuth } from "../auth.js";
import { buildSystemReadinessReport } from "../services/systemReadinessCore.js";

const router = Router();

router.get("/readiness", requireAuth, async (_req, res) => {
  try {
    const report = await buildSystemReadinessReport();
    res.json(report);
  } catch (e) {
    console.error("[platform/readiness] build failed:", e);
    res.status(500).json({
      error: "readiness_build_failed",
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

export default router;
