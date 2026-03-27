/**
 * Shared Twilio request signature validation for modular webhooks.
 * Mirrors discipline in `telephonyRoutes` (SKIP_TWILIO_VALIDATION / dev skip, URL variants).
 *
 * Signature validation uses the **exact URL Twilio POSTed to** (scheme + host + path + query).
 * Behind reverse proxies, set `TWILIO_WEBHOOK_SIGNATURE_BASE_URL` to your public HTTPS origin
 * (no trailing slash); we validate against `${BASE}${req.originalUrl}`.
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
import type { NextFunction, Request, Response } from "express";
import twilio from "twilio";

const LOCALS_URL_KEY = "twilioWebhookFullUrl" as const;

/** Full URL Twilio used (or would use) for signing — stored on `res.locals` for intake logs. */
export function computeTwilioWebhookFullUrl(req: Request): string {
  const base = process.env.TWILIO_WEBHOOK_SIGNATURE_BASE_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}${req.originalUrl}`;
  }
  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "unknown-host";
  return `${protocol}://${host}${req.originalUrl}`;
}

export function validateTwilioWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  const fullUrl = computeTwilioWebhookFullUrl(req);
  (res.locals as Record<string, string>)[LOCALS_URL_KEY] = fullUrl;

  const skipValidation =
    process.env.SKIP_TWILIO_VALIDATION === "true" || process.env.NODE_ENV === "development";

  if (skipValidation) {
    console.log("[TwilioSignature] Skipping validation (development or SKIP_TWILIO_VALIDATION)");
    next();
    return;
  }

  const twilioSignature = req.headers["x-twilio-signature"];
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioSignature || typeof twilioSignature !== "string" || !authToken) {
    console.warn("[TwilioSignature] Missing X-Twilio-Signature or TWILIO_AUTH_TOKEN");
    res.status(403).send("Forbidden");
    return;
  }

  try {
    const body = req.body as Record<string, string>;
    const usingPublicBase = Boolean(process.env.TWILIO_WEBHOOK_SIGNATURE_BASE_URL?.trim());

    let isValid = twilio.validateRequest(authToken, twilioSignature, fullUrl, body);

    if (!isValid && !usingPublicBase) {
      const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = req.get("host") || "unknown-host";
      if (protocol === "http") {
        const httpsUrl = `https://${host}${req.originalUrl}`;
        isValid = twilio.validateRequest(authToken, twilioSignature, httpsUrl, body);
        if (isValid) {
          (res.locals as Record<string, string>)[LOCALS_URL_KEY] = httpsUrl;
        }
      }
    }

    if (!isValid) {
      console.warn("[TwilioSignature] Invalid signature", { attemptedUrl: fullUrl });
      res.status(403).send("Forbidden");
      return;
    }

    next();
  } catch (err) {
    console.error("[TwilioSignature] Validation error:", err);
    res.status(403).send("Forbidden");
  }
}
