/**
 * Sovereign SMS Router — A2P 10DLC Compliance Middleware
 *
 * Every outbound SMS on the Gateway Global AI platform MUST flow through
 * dispatchSms().  Direct calls to twilio.sendSms() bypass compliance and
 * are reserved for legacy paths (energy nudges, raw OTP flows) that have
 * not yet been migrated.
 *
 * The 6 Messaging Service pipes are sourced from environment variables so
 * that each Twilio Messaging Service SID can be configured in Doppler without
 * touching code.  Register these in Doppler before deploying:
 *
 *   TWILIO_MS_PLATFORM_OTP   — Toll-Free 1-888; Platform 2FA/resets
 *   TWILIO_MS_PLATFORM_CARE  — A2P Local; Billing alerts, energy nudges
 *   TWILIO_MS_PLATFORM_MKTG  — A2P Local; Referral/claim invites
 *   TWILIO_MS_CUSTOMER_OTP   — Toll-Free; End-user identity verification
 *   TWILIO_MS_CUSTOMER_CARE  — A2P Local; Warrant links, confirmations
 *   TWILIO_MS_CUSTOMER_MKTG  — A2P Local; Business owner promo blasts
 */

import { db } from "../db";
import { smsOptOuts, smsLogs } from "@shared/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getTwilioClient } from "../twilio";

// ── Intent Enum ───────────────────────────────────────────────────────────────

export enum SmsIntent {
  PLATFORM_OTP   = "PLATFORM_OTP",
  PLATFORM_CARE  = "PLATFORM_CARE",
  PLATFORM_MKTG  = "PLATFORM_MKTG",
  CUSTOMER_OTP   = "CUSTOMER_OTP",
  CUSTOMER_CARE  = "CUSTOMER_CARE",
  CUSTOMER_MKTG  = "CUSTOMER_MKTG",
}

// ── Intent → Messaging Service SID map ───────────────────────────────────────

function resolveMessagingServiceSid(intent: SmsIntent): string {
  const map: Record<SmsIntent, string | undefined> = {
    [SmsIntent.PLATFORM_OTP]:   process.env.TWILIO_MS_PLATFORM_OTP,
    [SmsIntent.PLATFORM_CARE]:  process.env.TWILIO_MS_PLATFORM_CARE,
    [SmsIntent.PLATFORM_MKTG]:  process.env.TWILIO_MS_PLATFORM_MKTG,
    [SmsIntent.CUSTOMER_OTP]:   process.env.TWILIO_MS_CUSTOMER_OTP,
    [SmsIntent.CUSTOMER_CARE]:  process.env.TWILIO_MS_CUSTOMER_CARE,
    [SmsIntent.CUSTOMER_MKTG]:  process.env.TWILIO_MS_CUSTOMER_MKTG,
  };

  const sid = map[intent];
  if (!sid) {
    throw new Error(
      `[SmsRouter] Messaging Service SID not configured for intent "${intent}". ` +
      `Set the corresponding TWILIO_MS_* environment variable in Doppler.`
    );
  }
  return sid;
}

// ── Compliance footer rules ───────────────────────────────────────────────────

const MARKETING_INTENTS = new Set<SmsIntent>([
  SmsIntent.PLATFORM_MKTG,
  SmsIntent.CUSTOMER_MKTG,
]);

const OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

function appendComplianceFooter(body: string, intent: SmsIntent): string {
  if (!MARKETING_INTENTS.has(intent)) return body;
  // Avoid appending a duplicate footer if the caller already included one.
  if (body.toLowerCase().includes("reply stop")) return body;
  return body + OPT_OUT_FOOTER;
}

// ── Opt-out check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the number is blocked:
 *   — global platform opt-out  (siteConfigId IS NULL)
 *   — tenant-scoped opt-out    (siteConfigId = this tenant)
 */
async function isOptedOut(phoneNumber: string, siteConfigId: string): Promise<boolean> {
  const rows = await db
    .select({ id: smsOptOuts.id })
    .from(smsOptOuts)
    .where(
      and(
        eq(smsOptOuts.phoneNumber, phoneNumber),
        or(
          isNull(smsOptOuts.siteConfigId),
          eq(smsOptOuts.siteConfigId, siteConfigId),
        ),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// ── Log writer ────────────────────────────────────────────────────────────────

async function writeLog(entry: {
  siteConfigId:        string;
  messagingServiceSid: string;
  intent:              SmsIntent;
  toPhoneNumber:       string;
  body:                string;
  status:              string;
  twilioMessageSid?:   string;
  errorMessage?:       string;
}): Promise<void> {
  try {
    await db.insert(smsLogs).values({
      siteConfigId:        entry.siteConfigId,
      messagingServiceSid: entry.messagingServiceSid,
      intent:              entry.intent as any,
      toPhoneNumber:       entry.toPhoneNumber,
      body:                entry.body,
      status:              entry.status,
      twilioMessageSid:    entry.twilioMessageSid ?? null,
      errorMessage:        entry.errorMessage ?? null,
      segments:            Math.ceil(entry.body.length / 160),
    });
  } catch (logErr) {
    // Log failures must never crash the caller.
    console.error("[SmsRouter] Failed to write sms_log:", logErr);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DispatchResult =
  | { ok: true;  sid: string }
  | { ok: false; reason: "compliance_block" | "send_error"; message: string };

/**
 * Central SMS dispatch function.  All outbound SMS with a known business
 * intent MUST call this instead of twilio.sendSms() directly.
 *
 * @param to           Destination phone number in E.164 format.
 * @param body         Message body (compliance footer appended automatically).
 * @param intent       One of the 6 A2P pipe identifiers.
 * @param siteConfigId The site/tenant this message belongs to (for billing and opt-out scope).
 */
export async function dispatchSms(params: {
  to:           string;
  body:         string;
  intent:       SmsIntent;
  siteConfigId: string;
}): Promise<DispatchResult> {
  const { to, intent, siteConfigId } = params;

  // 1. Resolve the Messaging Service SID — fail fast if not configured.
  let messagingServiceSid: string;
  try {
    messagingServiceSid = resolveMessagingServiceSid(intent);
  } catch (err: any) {
    console.error(err.message);
    return { ok: false, reason: "send_error", message: err.message };
  }

  // 2. Compliance gate — check opt-out table before touching Twilio.
  const blocked = await isOptedOut(to, siteConfigId);
  if (blocked) {
    console.warn(
      `[SmsRouter] Compliance block: ${to} is opted out for site ${siteConfigId} (intent: ${intent})`
    );
    await writeLog({
      siteConfigId,
      messagingServiceSid,
      intent,
      toPhoneNumber: to,
      body: params.body,
      status: "compliance_block",
      errorMessage: "Recipient opted out",
    });
    return { ok: false, reason: "compliance_block", message: "Recipient has opted out" };
  }

  // 3. Append compliance footer for marketing intents.
  const finalBody = appendComplianceFooter(params.body, intent);

  // 4. Dispatch via Twilio Messaging Service (not raw phone number).
  try {
    const client = await getTwilioClient();
    const message = await client.messages.create({
      messagingServiceSid,
      to,
      body: finalBody,
    });

    await writeLog({
      siteConfigId,
      messagingServiceSid,
      intent,
      toPhoneNumber: to,
      body: finalBody,
      status: message.status ?? "queued",
      twilioMessageSid: message.sid,
    });

    console.log(
      `[SmsRouter] Sent | intent=${intent} | to=${to} | sid=${message.sid} | site=${siteConfigId}`
    );
    return { ok: true, sid: message.sid };
  } catch (err: any) {
    const errMsg: string = err?.message ?? "Unknown Twilio error";
    console.error(`[SmsRouter] Send failed | intent=${intent} | to=${to} | error=${errMsg}`);

    await writeLog({
      siteConfigId,
      messagingServiceSid,
      intent,
      toPhoneNumber: to,
      body: finalBody,
      status: "failed",
      errorMessage: errMsg,
    });

    return { ok: false, reason: "send_error", message: errMsg };
  }
}
