/**
 * Batch / laborious text completion via local Ollama — NOT on Gemini Live voice path.
 * Auth: admin session only (requireAuth).
 * Env: LOCAL_LLM_BASE_URL, LOCAL_LLM_MODEL (see server/local-voice/config.ts).
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { getLocalVoiceConfig } from "../local-voice/config";

const router = Router();

const bodySchema = z.object({
  prompt: z.string().min(1).max(120_000),
  system: z.string().max(32_000).optional(),
  maxTokens: z.number().int().min(64).max(8192).optional(),
});

/**
 * POST /api/local-llm-batch/complete
 * Headers: Authorization: Bearer <admin session token>
 */
router.post("/complete", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { prompt, system, maxTokens } = parsed.data;
    const config = getLocalVoiceConfig();
    const fullPrompt = system ? `${system}\n\n---\n\n${prompt}` : prompt;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const r = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.ollamaModel,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: maxTokens ?? 1024,
          },
        }),
        signal: controller.signal,
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        res.status(502).json({
          error: "Local LLM request failed",
          status: r.status,
          detail: errText.slice(0, 500),
        });
        return;
      }
      const payload = (await r.json()) as { response?: string };
      res.json({
        ok: true,
        model: config.ollamaModel,
        text: payload.response ?? "",
      });
    } finally {
      clearTimeout(t);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort")) {
      res.status(504).json({ error: "Local LLM timeout", timeoutMs: getLocalVoiceConfig().requestTimeoutMs });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

export default router;
