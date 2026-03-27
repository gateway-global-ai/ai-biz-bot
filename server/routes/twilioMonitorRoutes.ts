/**
 * Twilio Monitor / Console Debugger inbound webhooks (platform observability).
 * Phase 10a — fail-closed signature validation, then **ingestion only** (telemetry; no policy execution).
 * @see https://www.twilio.com/docs/usage/troubleshooting/debugging-event-webhooks
 */
import { Router, type Request, type Response } from "express";
import { validateTwilioWebhookSignature } from "../middleware/twilioWebhookSignature";
import { normalizeTwilioDebuggerPost } from "../services/twilioDebuggerIngest";

const router = Router();

function safeHeaderSnapshot(req: Request): Record<string, string | undefined> {
  return {
    "content-type": readHeader(req, "content-type"),
    host: readHeader(req, "host"),
    "x-forwarded-proto": readHeader(req, "x-forwarded-proto"),
    "x-forwarded-host": readHeader(req, "x-forwarded-host"),
    "i-twilio-idempotency-token": readHeader(req, "i-twilio-idempotency-token"),
    "x-twilio-signature": readHeader(req, "x-twilio-signature") ? "[present]" : undefined,
  };
}

function readHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Twilio Console → Debugger → HTTP POST (application/x-www-form-urlencoded).
 * Configure URL: https://{your-host}/api/twilio/monitor/debug-event
 */
router.post(
  "/api/twilio/monitor/debug-event",
  validateTwilioWebhookSignature,
  (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const normalized = normalizeTwilioDebuggerPost(body);
      const validationUrl = (res.locals as { twilioWebhookFullUrl?: string }).twilioWebhookFullUrl;

      const intake = {
        kind: "twilio_debugger_intake",
        receivedAt: new Date().toISOString(),
        /** Exact URL used for `validateRequest` (must match Twilio Console configuration behind proxies). */
        twilioWebhookFullUrl: validationUrl ?? null,
        requestHeaders: safeHeaderSnapshot(req),
        /** Raw form fields as Twilio sent them (forensics; `Payload` is JSON string per Twilio docs). */
        rawForm: body,
        normalized,
      };

      console.log("[TwilioDebugger]", JSON.stringify(intake));
      res.status(200).type("text/plain").send("OK");
    } catch (e) {
      console.error("[TwilioDebugger] Handler error:", e);
      res.status(200).type("text/plain").send("OK");
    }
  },
);

export default router;
