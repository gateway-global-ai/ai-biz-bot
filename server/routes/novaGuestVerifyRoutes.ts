/**
 * NOVA guest verification — browser + SDK (no RSA gate).
 * POST /api/nova/guest/verify/start
 * POST /api/nova/guest/verify/complete
 */

import { Router, type Request, type Response } from "express";
import { createVerificationGateMiddleware } from "../middleware/verificationGateTransparency";
import {
  guestVerificationComplete,
  guestVerificationStart,
} from "../services/novaGuestVerification";

const router = Router();

router.use(createVerificationGateMiddleware("nova_guest_http"));

router.post("/guest/verify/start", async (req: Request, res: Response) => {
  try {
    const { siteConfigId, phone, flowType } = req.body as {
      siteConfigId?: string;
      phone?: string;
      flowType?: "guest_phone" | "guest_checkin";
    };
    if (!siteConfigId || !phone) {
      return res.status(400).json({ error: "siteConfigId and phone are required." });
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

router.post("/guest/verify/complete", async (req: Request, res: Response) => {
  try {
    const { siteConfigId, phone, code, sessionId } = req.body as {
      siteConfigId?: string;
      phone?: string;
      code?: string;
      sessionId?: string;
    };
    if (!siteConfigId || !phone || !code) {
      return res.status(400).json({ error: "siteConfigId, phone, and code are required." });
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
