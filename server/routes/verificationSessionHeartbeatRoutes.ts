/**
 * POST /api/v1/verification/session_heartbeat
 * Browser voice client — logs a passage after mic/worklet pipeline is live (not on raw WS open).
 * Fire-and-forget from GeminiStreamingClient; same transparency middleware as other verification routes.
 */

import { Router, type Request, type Response } from "express";
import { createVerificationGateMiddleware } from "../middleware/verificationGateTransparency";

const router = Router();

router.use(createVerificationGateMiddleware("voice_client_heartbeat"));

router.post("/session_heartbeat", (req: Request, res: Response) => {
  const { siteConfigId, transport } = req.body as {
    siteConfigId?: string;
    transport?: string;
  };
  if (!siteConfigId || typeof siteConfigId !== "string") {
    return res.status(400).json({ error: "siteConfigId is required." });
  }
  if (transport != null && typeof transport !== "string") {
    return res.status(400).json({ error: "transport must be a string when provided." });
  }
  return res.status(204).send();
});

export default router;
