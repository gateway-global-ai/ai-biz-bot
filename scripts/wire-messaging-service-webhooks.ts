/**
 * Wire existing Twilio Messaging Services to the platform inbound webhook.
 * Use when the 6 Sovereign SMS Router services already exist and you need
 * to set or update their Inbound Request URL to the STOP/START opt-out handler.
 *
 * Run with Doppler (so TWILIO_* and APP_URL are set):
 *
 *   doppler run -- npx tsx scripts/wire-messaging-service-webhooks.ts
 *
 * Reads the 6 TWILIO_MS_* SIDs from env and calls the Messaging Service
 * Update API for each: inboundRequestUrl, inboundMethod POST.
 * See: https://www.twilio.com/docs/messaging/api/service-resource#update-a-service
 */

import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
/** Base URL for webhooks; set APP_URL in Doppler for prod (e.g. https://aibizbot.gatewayglobal.ai). */
const APP_URL = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";

const INBOUND_WEBHOOK_URL = `${APP_URL.replace(/\/$/, "")}/api/webhooks/twilio/incoming`;

const MS_KEYS = [
  "TWILIO_MS_PLATFORM_OTP",
  "TWILIO_MS_PLATFORM_CARE",
  "TWILIO_MS_PLATFORM_MKTG",
  "TWILIO_MS_CUSTOMER_OTP",
  "TWILIO_MS_CUSTOMER_CARE",
  "TWILIO_MS_CUSTOMER_MKTG",
] as const;

async function main(): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (e.g. via doppler run --)");
    process.exit(1);
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log(`[wire-messaging-service-webhooks] Inbound URL: ${INBOUND_WEBHOOK_URL}\n`);

  let updated = 0;
  for (const key of MS_KEYS) {
    const sid = process.env[key];
    if (!sid) {
      console.log(`   Skip ${key}: not set`);
      continue;
    }
    try {
      await client.messaging.v1.services(sid).update({
        inboundRequestUrl: INBOUND_WEBHOOK_URL,
        inboundMethod: "POST",
      });
      console.log(`   OK ${key}: ${sid}`);
      updated++;
    } catch (err: unknown) {
      const msg = err && typeof (err as any).message === "string" ? (err as any).message : "";
      console.error(`   FAIL ${key}: ${msg}`);
    }
  }

  console.log(`\n[wire-messaging-service-webhooks] Updated ${updated} service(s).`);
}

main().catch((err) => {
  console.error("[wire-messaging-service-webhooks] Fatal error:", err);
  process.exit(1);
});
