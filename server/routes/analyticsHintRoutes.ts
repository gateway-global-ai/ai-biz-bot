/**
 * Lightweight analytics hints (latency, turn-taking) — async DB insert, no blocking.
 */
import { Router } from "express";
import { z } from "zod";
import { enqueueVoiceLatencyHint } from "../services/conversationLatencyMetrics";

const router = Router();

const bodySchema = z.object({
  siteConfigId: z.string().optional(),
  msToFirstToken: z.number().optional(),
  sessionKind: z.enum(["web_voice", "pstn"]).optional(),
});

router.post("/api/analytics/voice-latency-hint", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  await enqueueVoiceLatencyHint(parsed.data);
  res.json({ ok: true });
});

export default router;
