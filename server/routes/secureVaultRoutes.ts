/**
 * Zero-LLM secure vault handoff — session + site-scoped only; no model-managed auth.
 *
 * POST /api/v1/secure-vault/submit
 * Response: { success: true, vaultHandoffToken, category } — never returns opaque_reference.
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth";
import { parseSecureVaultBody, processSecureVaultSubmission } from "../skills/secureVaultSkill";
import { assertSiteScopedAccess } from "../utils/siteScopedAccess";

const router = Router();

router.post("/api/v1/secure-vault/submit", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseSecureVaultBody(req.body);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      code: parsed.error.code,
      message: parsed.error.message,
    });
  }

  const access = await assertSiteScopedAccess({
    req,
    siteConfigId: parsed.data.siteConfigId,
    requiredPolicy: "secure.vault.write",
  });
  if (!access.ok) {
    return res.status(access.status).json({ success: false, error: access.error });
  }

  const result = await processSecureVaultSubmission(parsed.data, {
    adminUserId: access.context.adminUserId,
  });
  if (!result.ok) {
    const status =
      result.code === "POLICY"
        ? 403
        : result.code === "VALIDATION"
          ? 400
          : result.code === "CONFLICT"
            ? 409
            : 500;
    return res.status(status).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }
  return res.json({
    success: true,
    vaultHandoffToken: result.vaultHandoffToken,
    category: result.category,
  });
});

export default router;
