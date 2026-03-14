/**
 * Bootstrap Business Telephony (governed, repeatable)
 *
 * Usage:
 *   doppler run -- npx tsx scripts/bootstrap-business-telephony.ts \
 *     --siteConfigId=<site_config_id> \
 *     --phoneSid=<PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx> \
 *     [--mode=subaccount|primary] \
 *     [--baseUrl=https://aibizbot-dev.gatewayglobal.ai]
 *
 * Notes:
 * - mode defaults to "subaccount" (governance policy), even if number is in primary account.
 * - This script enforces canonical webhook wiring and caller name lookup.
 */

import twilio from "twilio";
import { storage } from "../server/storage";

type Mode = "subaccount" | "primary";

function getArg(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function resolveTwilioCredentials() {
  const accountSid =
    process.env.SYSTEM_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken =
    process.env.SYSTEM_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      "Missing Twilio credentials. Set SYSTEM_TWILIO_ACCOUNT_SID/SYSTEM_TWILIO_AUTH_TOKEN (or legacy TWILIO_*)."
    );
  }
  return { accountSid, authToken };
}

async function main() {
  const siteConfigId = getArg("siteConfigId");
  const phoneSid = getArg("phoneSid");
  const mode = ((getArg("mode") || "subaccount") as Mode);
  const baseUrlRaw = getArg("baseUrl") || process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";
  const baseUrl = (() => {
    try {
      return new URL(baseUrlRaw).origin;
    } catch {
      return baseUrlRaw.replace(/\/$/, "");
    }
  })();

  if (!siteConfigId) throw new Error("Missing --siteConfigId");
  if (!phoneSid) throw new Error("Missing --phoneSid");
  if (mode !== "subaccount" && mode !== "primary") {
    throw new Error("Invalid --mode. Use subaccount or primary");
  }

  const site = await storage.getSiteConfigById(siteConfigId);
  if (!site) throw new Error(`Site config not found: ${siteConfigId}`);

  const { accountSid, authToken } = resolveTwilioCredentials();
  const client = twilio(accountSid, authToken);
  const number = await client.incomingPhoneNumbers(phoneSid).fetch();

  const webhookConfig = {
    voiceUrl: `${baseUrl}/webhook/voice/stream`,
    voiceFallbackUrl: `${baseUrl}/webhook/error`,
    statusCallback: `${baseUrl}/webhook/voice/status`,
    smsUrl: `${baseUrl}/webhook/sms`,
    smsFallbackUrl: `${baseUrl}/webhook/error`,
    smsStatusCallback: `${baseUrl}/webhook/sms/status`,
    voiceCallerIdLookup: true,
  };

  await client.incomingPhoneNumbers(phoneSid).update({
    voiceUrl: webhookConfig.voiceUrl,
    voiceMethod: "POST",
    voiceFallbackUrl: webhookConfig.voiceFallbackUrl,
    voiceFallbackMethod: "POST",
    statusCallback: webhookConfig.statusCallback,
    statusCallbackMethod: "POST",
    smsUrl: webhookConfig.smsUrl,
    smsMethod: "POST",
    smsFallbackUrl: webhookConfig.smsFallbackUrl,
    smsFallbackMethod: "POST",
    smsStatusCallback: webhookConfig.smsStatusCallback,
    voiceCallerIdLookup: webhookConfig.voiceCallerIdLookup,
  });

  let telephony = await storage.getTelephonyConfig();
  if (!telephony) {
    telephony = await storage.createTelephonyConfig({
      accountSid,
      authToken,
      phoneNumber: number.phoneNumber,
      phoneSid: number.sid,
      friendlyName: number.friendlyName || "AI Agent Trunk",
      isSubAccount: mode === "subaccount",
      parentAccountSid: mode === "subaccount" ? accountSid : null,
      voiceUrl: webhookConfig.voiceUrl,
      voiceFallbackUrl: webhookConfig.voiceFallbackUrl,
      statusCallbackUrl: webhookConfig.statusCallback,
      smsUrl: webhookConfig.smsUrl,
      smsFallbackUrl: webhookConfig.smsFallbackUrl,
      errorUrl: webhookConfig.voiceFallbackUrl,
      callerIdName: number.friendlyName || "Gateway Global AI",
      siteConfigId,
    } as any);
  } else {
    await storage.updateTelephonyConfig(telephony.id, {
      accountSid,
      authToken,
      phoneNumber: number.phoneNumber,
      phoneSid: number.sid,
      friendlyName: number.friendlyName || telephony.friendlyName,
      isSubAccount: mode === "subaccount",
      parentAccountSid: mode === "subaccount" ? accountSid : null,
      voiceUrl: webhookConfig.voiceUrl,
      voiceFallbackUrl: webhookConfig.voiceFallbackUrl,
      statusCallbackUrl: webhookConfig.statusCallback,
      smsUrl: webhookConfig.smsUrl,
      smsFallbackUrl: webhookConfig.smsFallbackUrl,
      errorUrl: webhookConfig.voiceFallbackUrl,
      siteConfigId,
    } as any);
  }

  await storage.updateSiteConfig(siteConfigId, {
    provisionedPhoneNumber: number.phoneNumber,
    agentConfig: {
      ...((site as any).agentConfig || {}),
      telephonyGovernance: {
        provisioningMode: mode,
        accountScope: mode === "subaccount" ? "tenant_isolated" : "primary_shared",
        lastBootstrapAt: new Date().toISOString(),
        phoneSid: number.sid,
      },
    },
  } as any);

  console.log("telephony_bootstrap:ok");
  console.log(`site_config_id:${siteConfigId}`);
  console.log(`mode:${mode}`);
  console.log(`phone_sid:${number.sid}`);
  console.log(`phone_number:${number.phoneNumber}`);
  console.log(`caller_lookup:enabled`);
  console.log(`voice_url:${webhookConfig.voiceUrl}`);
  console.log(`sms_url:${webhookConfig.smsUrl}`);
}

main().catch((err: any) => {
  console.error(`telephony_bootstrap:error:${err?.message || err}`);
  process.exit(1);
});

