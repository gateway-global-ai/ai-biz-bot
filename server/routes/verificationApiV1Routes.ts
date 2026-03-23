/**
 * Public verification API v1 — Bearer installation key (remote OS).
 * POST /api/v1/verification/guest/start
 * POST /api/v1/verification/guest/complete
 *
 * Twilio/SMS stays server-side; callers never receive Twilio secrets.
 */

import { Router, type Request, type Response } from "express";
import { createVerificationGateMiddleware } from "../middleware/verificationGateTransparency";
import { guestVerificationComplete, guestVerificationStart } from "../services/novaGuestVerification";
import {
  keyHasPermission,
  touchInstallationApiKeyLastUsed,
  validateInstallationApiKey,
} from "../services/verificationInstallationApiKeys";

const router = Router();

router.use(createVerificationGateMiddleware("api_v1_verification"));

const GUEST_PERM = "verification.guest";

type InstallationReq = Request & {
  verificationInstallation?: { siteConfigId: string; keyId: string };
};

async function requireInstallationApiKey(req: InstallationReq, res: Response, next: () => void) {
  const header = req.headers.authorization;
  const bearer =
    typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const xRaw = req.headers["x-api-key"];
  const xKey = typeof xRaw === "string" ? xRaw.trim() : "";
  const token = bearer || xKey;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization Bearer or X-API-Key." });
    return;
  }
  const v = await validateInstallationApiKey(token);
  if (!v.ok) {
    res.status(401).json({ error: v.error });
    return;
  }
  if (!keyHasPermission(v.permissions, GUEST_PERM)) {
    res.status(403).json({ error: "Key lacks verification.guest permission." });
    return;
  }
  req.verificationInstallation = { siteConfigId: v.siteConfigId, keyId: v.keyId };
  await touchInstallationApiKeyLastUsed(v.keyId);
  next();
}

router.post("/guest/start", requireInstallationApiKey, async (req: InstallationReq, res: Response) => {
  try {
    const siteConfigId = req.verificationInstallation?.siteConfigId;
    if (!siteConfigId) {
      return res.status(500).json({ error: "Missing installation context." });
    }
    const { phone, flowType } = req.body as {
      phone?: string;
      flowType?: "guest_phone" | "guest_checkin";
    };
    if (!phone) {
      return res.status(400).json({ error: "phone is required." });
    }
    const ft = flowType === "guest_checkin" ? "guest_checkin" : "guest_phone";
    const result = await guestVerificationStart({ siteConfigId, phone, flowType: ft });
    if (!result.ok) {
      return res.status(400).json({ error: result.error || "Start failed." });
    }
    return res.json({
      ok: true,
      sessionId: result.sessionId,
      devMode: result.devMode === true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/guest/complete", requireInstallationApiKey, async (req: InstallationReq, res: Response) => {
  try {
    const siteConfigId = req.verificationInstallation?.siteConfigId;
    if (!siteConfigId) {
      return res.status(500).json({ error: "Missing installation context." });
    }
    const { phone, code, sessionId } = req.body as {
      phone?: string;
      code?: string;
      sessionId?: string;
    };
    if (!phone || !code) {
      return res.status(400).json({ error: "phone and code are required." });
    }
    const result = await guestVerificationComplete({
      siteConfigId,
      phone,
      code,
      sessionId,
    });
    if (!result.ok) {
      return res.status(401).json({ error: result.error || "Verification failed." });
    }
    return res.json({
      ok: true,
      verificationToken: result.verificationToken,
      expiresAt: result.expiresAt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
