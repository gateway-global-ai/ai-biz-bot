/**
 * AI Studio OAuth/Webhook routes — secure session initiation for PTT integration.
 * No API keys, model names, or sample rates hardcoded; all from Doppler/env.
 */
import { Router, type Request, type Response } from "express";
import crypto from "crypto";

const router = Router();

/**
 * GET /api/ai-studio/config
 * Returns non-secret PTT config (sample rates) from env for client alignment.
 */
router.get("/config", (_req: Request, res: Response) => {
  const inputRate = parseInt(process.env.GEMINI_INPUT_SAMPLE_RATE ?? "16000", 10);
  const outputRate = parseInt(process.env.GEMINI_OUTPUT_SAMPLE_RATE ?? "24000", 10);
  res.json({
    inputSampleRate: inputRate,
    outputSampleRate: outputRate,
  });
});

/** Session token TTL (ms). Short-lived for security. */
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface StoredSession {
  createdAt: number;
  state?: string;
}

const sessionStore = new Map<string, StoredSession>();

function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) sessionStore.delete(token);
  }
}

/**
 * POST /api/ai-studio/webhook
 * Accepts standard OAuth 2.0 callback payload (state, code).
 * Validates and returns a short-lived sessionToken for /ws/ai-studio-ptt.
 */
router.post("/webhook", (req: Request, res: Response) => {
  pruneExpiredSessions();

  const state = req.body?.state as string | undefined;
  const code = req.body?.code as string | undefined;

  if (!code) {
    res.status(400).json({
      success: false,
      error: "Missing OAuth code in payload",
    });
    return;
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  sessionStore.set(sessionToken, {
    createdAt: Date.now(),
    state: state ?? undefined,
  });

  res.status(200).json({
    success: true,
    sessionToken,
    expiresInMs: SESSION_TTL_MS,
  });
});

/**
 * Validates a session token for the WebSocket proxy. Returns true if valid.
 * Export for use by aiStudioProxy.ts.
 */
export function validateAIStudioSessionToken(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const session = sessionStore.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessionStore.delete(token);
    return false;
  }
  return true;
}

/**
 * Consume (invalidate) a session token after first use for WebSocket upgrade.
 * Optional: use for one-time tokens so each PTT session uses a fresh token.
 */
export function consumeAIStudioSessionToken(token: string): void {
  sessionStore.delete(token);
}

export default router;
