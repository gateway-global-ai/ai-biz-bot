/**
 * Twilio Incoming Webhook Handler — A2P 10DLC Opt-Out Receiver
 *
 * POST /api/webhooks/twilio/incoming
 *
 * Twilio calls this URL whenever a user replies to any of the platform's
 * phone numbers.  This handler is the compliance shield: it intercepts
 * opt-out and opt-in keywords before they are processed anywhere else,
 * writing to sms_opt_outs so dispatchSms() blocks future sends instantly.
 *
 * Opt-out keywords  (TCPA + CTIA mandated): STOP, STOPALL, UNSUBSCRIBE,
 *                                            CANCEL, END, QUIT
 * Opt-in  keywords:                          START, YES, UNSTOP
 *
 * How siteConfigId is resolved (per the Sovereign SMS Router spec):
 *   req.body.From  — the end-user's number being blocked/unblocked.
 *   req.body.To    — the Gateway Global AI number they replied to.
 *                    We query siteConfigs.provisionedPhoneNumber to find
 *                    the tenant who owns that number.
 *                    If no tenant matches, siteConfigId = null, which
 *                    triggers a global platform opt-out.
 *
 * Twilio requires a valid TwiML XML response even when we take no action.
 * We always return <Response/> (empty) so Twilio does not retry or log errors.
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { smsOptOuts, siteConfigs } from "@shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";

const router = Router();

// ── Keyword sets (normalised to uppercase before comparison) ──────────────────

const OPT_OUT_KEYWORDS = new Set([
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
]);

const OPT_IN_KEYWORDS = new Set([
  "START", "YES", "UNSTOP",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the first word from the message body for keyword matching. */
function extractKeyword(body: string): string {
  return body.trim().split(/\s+/)[0].toUpperCase();
}

/**
 * Given the To number (the GGW platform number the user replied to),
 * resolve the siteConfigId by looking up provisionedPhoneNumber.
 * Returns null if no tenant owns that number → global opt-out.
 */
async function resolveSiteConfigId(toNumber: string): Promise<string | null> {
  if (!toNumber) return null;
  const rows = await db
    .select({ id: siteConfigs.id })
    .from(siteConfigs)
    .where(eq(siteConfigs.provisionedPhoneNumber, toNumber))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** True if this phone+site combo is already in the opt-out table. */
async function isAlreadyOptedOut(phoneNumber: string, siteConfigId: string | null): Promise<boolean> {
  const rows = await db
    .select({ id: smsOptOuts.id })
    .from(smsOptOuts)
    .where(
      and(
        eq(smsOptOuts.phoneNumber, phoneNumber),
        siteConfigId
          ? eq(smsOptOuts.siteConfigId, siteConfigId)
          : isNull(smsOptOuts.siteConfigId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ── TwiML response helper ─────────────────────────────────────────────────────

function twimlEmpty(res: Response): void {
  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/twilio/incoming
 *
 * Public endpoint — Twilio signs requests with X-Twilio-Signature but
 * signature validation requires the full URL which varies per environment.
 * For now we accept all POST requests and rely on the fact that this
 * endpoint only reads/writes opt-out state (no sensitive data returned).
 * TODO: Add twilio.validateRequest() once the canonical webhook URL is
 * pinned in Doppler as TWILIO_WEBHOOK_BASE_URL.
 */
router.post("/api/webhooks/twilio/incoming", async (req: Request, res: Response) => {
  const from: string = (req.body?.From as string) ?? "";
  const to:   string = (req.body?.To   as string) ?? "";
  const body: string = (req.body?.Body as string) ?? "";

  if (!from || !body) {
    // Malformed request — return empty TwiML so Twilio doesn't retry.
    return twimlEmpty(res);
  }

  const keyword = extractKeyword(body);

  // ── Opt-out ───────────────────────────────────────────────────────────────
  if (OPT_OUT_KEYWORDS.has(keyword)) {
    const siteConfigId = await resolveSiteConfigId(to);

    const alreadyOut = await isAlreadyOptedOut(from, siteConfigId);
    if (!alreadyOut) {
      await db.insert(smsOptOuts).values({
        phoneNumber:  from,
        siteConfigId: siteConfigId ?? undefined,
        reason:       `${keyword} keyword received`,
      });
      console.log(
        `[TwilioWebhook] Opt-out recorded | from=${from} | to=${to} | siteConfigId=${siteConfigId ?? "global"} | keyword=${keyword}`
      );
    } else {
      console.log(
        `[TwilioWebhook] Opt-out already exists | from=${from} | siteConfigId=${siteConfigId ?? "global"}`
      );
    }

    return twimlEmpty(res);
  }

  // ── Opt-in ────────────────────────────────────────────────────────────────
  if (OPT_IN_KEYWORDS.has(keyword)) {
    const siteConfigId = await resolveSiteConfigId(to);

    // Delete matching opt-out row(s) — scoped to this tenant first, then global.
    const deleteResult = await db
      .delete(smsOptOuts)
      .where(
        and(
          eq(smsOptOuts.phoneNumber, from),
          siteConfigId
            ? or(
                eq(smsOptOuts.siteConfigId, siteConfigId),
                isNull(smsOptOuts.siteConfigId),
              )
            : isNull(smsOptOuts.siteConfigId),
        ),
      );

    console.log(
      `[TwilioWebhook] Opt-in processed | from=${from} | to=${to} | siteConfigId=${siteConfigId ?? "global"} | keyword=${keyword}`
    );
    void deleteResult; // drizzle delete returns void on pg driver

    return twimlEmpty(res);
  }

  // ── Non-compliance reply (regular inbound message) ────────────────────────
  // Not a STOP/START keyword — log and pass through without action.
  console.log(
    `[TwilioWebhook] Inbound message | from=${from} | to=${to} | keyword=${keyword} (not a compliance keyword)`
  );

  return twimlEmpty(res);
});

export default router;
