/**
 * Telephony Governance Audit (and optional auto-fix)
 *
 * Usage:
 *   doppler run -- npx tsx scripts/audit-telephony-governance.ts
 *   doppler run -- npx tsx scripts/audit-telephony-governance.ts --apply
 *
 * Optional args:
 *   --baseUrl=https://aibizbot-dev.gatewayglobal.ai
 *   --twimlAppSid=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   --verifySid=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * What it audits:
 * - Number-level voice/sms webhook governance
 * - Caller Name Lookup toggle
 * - Presence of required messaging service IDs in env
 * - Optional pinned TwiML App / Verify Service existence checks
 */

import twilio from "twilio";

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const APPLY = process.argv.includes("--apply");

function resolveCreds() {
  const accountSid = process.env.SYSTEM_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.SYSTEM_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      "Missing Twilio credentials. Set SYSTEM_TWILIO_ACCOUNT_SID/SYSTEM_TWILIO_AUTH_TOKEN (or legacy TWILIO_*)."
    );
  }
  return { accountSid, authToken };
}

function resolveBaseUrl() {
  const fromArg = getArg("baseUrl");
  if (fromArg) {
    try {
      return new URL(fromArg).origin;
    } catch {
      return fromArg.replace(/\/$/, "");
    }
  }
  const fromEnv = process.env.APP_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return fromEnv.replace(/\/$/, "");
    }
  }
  return "https://aibizbot-dev.gatewayglobal.ai";
}

function getExpected(baseUrl: string) {
  return {
    voiceUrl: `${baseUrl}/webhook/voice/stream`,
    voiceFallbackUrl: `${baseUrl}/webhook/error`,
    voiceStatusCallback: `${baseUrl}/webhook/voice/status`,
    smsUrl: `${baseUrl}/webhook/sms`,
    smsFallbackUrl: `${baseUrl}/webhook/error`,
    smsStatusCallback: `${baseUrl}/webhook/sms/status`,
  };
}

function normalizeVerifySid(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(VA[a-f0-9]{32})/i);
  return m?.[1] ?? raw;
}

function normalizeSid(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  const { accountSid, authToken } = resolveCreds();
  const baseUrl = resolveBaseUrl();
  const expected = getExpected(baseUrl);
  const twimlAppSid = getArg("twimlAppSid");
  const verifySid = normalizeVerifySid(getArg("verifySid") || process.env.TWILIO_VERIFY_SERVICE_URL_SID);

  const client = twilio(accountSid, authToken);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 200 });
  const messagingServices = await client.messaging.v1.services.list({ limit: 200 });

  const requiredMsKeys = [
    "TWILIO_MS_PLATFORM_OTP",
    "TWILIO_MS_PLATFORM_CARE",
    "TWILIO_MS_PLATFORM_MKTG",
    "TWILIO_MS_CUSTOMER_OTP",
    "TWILIO_MS_CUSTOMER_CARE",
    "TWILIO_MS_CUSTOMER_MKTG",
  ] as const;

  const msEnvStatus = requiredMsKeys.map((k) => ({
    key: k,
    sid: normalizeSid(process.env[k]),
    present: Boolean(normalizeSid(process.env[k])),
  }));
  const requiredMsSids = msEnvStatus
    .map((entry) => entry.sid)
    .filter((sid): sid is string => Boolean(sid));
  const requiredMsSidSet = new Set(requiredMsSids);

  const serviceBySid = new Map<string, any>();
  for (const service of messagingServices) {
    serviceBySid.set(service.sid, service);
  }

  let serviceFixCount = 0;
  for (const sid of requiredMsSidSet) {
    const svc = serviceBySid.get(sid);
    if (!svc) continue;
    const serviceNeedsFix =
      svc.inboundRequestUrl !== expected.smsUrl ||
      svc.fallbackUrl !== expected.smsFallbackUrl ||
      svc.statusCallback !== expected.smsStatusCallback;
    if (serviceNeedsFix && APPLY) {
      await client.messaging.v1.services(sid).update({
        inboundRequestUrl: expected.smsUrl,
        inboundMethod: "POST",
        fallbackUrl: expected.smsFallbackUrl,
        fallbackMethod: "POST",
        statusCallback: expected.smsStatusCallback,
      } as any);
      serviceFixCount++;
    }
  }

  if (APPLY && serviceFixCount > 0) {
    for (const sid of requiredMsSidSet) {
      try {
        const refreshed = await client.messaging.v1.services(sid).fetch();
        serviceBySid.set(sid, refreshed);
      } catch {
        // Keep the pre-refresh snapshot when fetch fails.
      }
    }
  }

  const numberRows = [];
  let fixedCount = 0;

  for (const n of numbers) {
    const serviceSmsStatusOk = requiredMsSids.some((sid) => {
      const svc = serviceBySid.get(sid);
      return Boolean(svc && svc.statusCallback === expected.smsStatusCallback);
    });

    const checks = {
      voiceUrlOk: n.voiceUrl === expected.voiceUrl,
      voiceFallbackOk: n.voiceFallbackUrl === expected.voiceFallbackUrl,
      voiceStatusOk: n.statusCallback === expected.voiceStatusCallback,
      smsUrlOk: n.smsUrl === expected.smsUrl,
      smsFallbackOk: n.smsFallbackUrl === expected.smsFallbackUrl,
      smsStatusOk: n.smsStatusCallback === expected.smsStatusCallback,
      smsStatusViaMessagingServiceOk: serviceSmsStatusOk,
      callerLookupEnabled: Boolean(n.voiceCallerIdLookup),
    };
    const ready =
      checks.voiceUrlOk &&
      checks.voiceFallbackOk &&
      checks.voiceStatusOk &&
      checks.smsUrlOk &&
      checks.smsFallbackOk &&
      (checks.smsStatusOk || checks.smsStatusViaMessagingServiceOk) &&
      checks.callerLookupEnabled;

    if (!ready && APPLY) {
      await client.incomingPhoneNumbers(n.sid).update({
        voiceUrl: expected.voiceUrl,
        voiceMethod: "POST",
        voiceFallbackUrl: expected.voiceFallbackUrl,
        voiceFallbackMethod: "POST",
        statusCallback: expected.voiceStatusCallback,
        statusCallbackMethod: "POST",
        smsUrl: expected.smsUrl,
        smsMethod: "POST",
        smsFallbackUrl: expected.smsFallbackUrl,
        smsFallbackMethod: "POST",
        smsStatusCallback: expected.smsStatusCallback,
        voiceCallerIdLookup: true,
      });
      fixedCount++;
    }

    const finalNumber =
      APPLY ? await client.incomingPhoneNumbers(n.sid).fetch() : n;

    numberRows.push({
      sid: finalNumber.sid,
      phoneNumber: finalNumber.phoneNumber,
      friendlyName: finalNumber.friendlyName || null,
      callerNameLookup: Boolean(finalNumber.voiceCallerIdLookup),
      routing: {
        voice: {
          requestUrl: finalNumber.voiceUrl || null,
          fallbackUrl: finalNumber.voiceFallbackUrl || null,
          statusCallback: finalNumber.statusCallback || null,
        },
        sms: {
          requestUrl: finalNumber.smsUrl || null,
          fallbackUrl: finalNumber.smsFallbackUrl || null,
          statusCallback: finalNumber.smsStatusCallback || null,
        },
      },
      checks: {
        ...checks,
        voiceUrlOk: finalNumber.voiceUrl === expected.voiceUrl,
        voiceFallbackOk: finalNumber.voiceFallbackUrl === expected.voiceFallbackUrl,
        voiceStatusOk: finalNumber.statusCallback === expected.voiceStatusCallback,
        smsUrlOk: finalNumber.smsUrl === expected.smsUrl,
        smsFallbackOk: finalNumber.smsFallbackUrl === expected.smsFallbackUrl,
        smsStatusOk: finalNumber.smsStatusCallback === expected.smsStatusCallback,
        callerLookupEnabled: Boolean(finalNumber.voiceCallerIdLookup),
      },
      ready:
        finalNumber.voiceUrl === expected.voiceUrl &&
        finalNumber.voiceFallbackUrl === expected.voiceFallbackUrl &&
        finalNumber.statusCallback === expected.voiceStatusCallback &&
        finalNumber.smsUrl === expected.smsUrl &&
        finalNumber.smsFallbackUrl === expected.smsFallbackUrl &&
        (finalNumber.smsStatusCallback === expected.smsStatusCallback || serviceSmsStatusOk) &&
        Boolean(finalNumber.voiceCallerIdLookup),
    });
  }

  let twimlAppFound: boolean | null = null;
  if (twimlAppSid) {
    try {
      await client.applications(twimlAppSid).fetch();
      twimlAppFound = true;
    } catch {
      twimlAppFound = false;
    }
  }

  let verifyServiceFound: boolean | null = null;
  if (verifySid) {
    try {
      await client.verify.v2.services(verifySid).fetch();
      verifyServiceFound = true;
    } catch {
      verifyServiceFound = false;
    }
  }

  const readyCount = numberRows.filter((n) => n.ready).length;
  const report = {
    mode: APPLY ? "apply" : "audit",
    accountSid,
    baseUrl,
    expected,
    totals: {
      numbers: numberRows.length,
      ready: readyCount,
      notReady: numberRows.length - readyCount,
      fixed: fixedCount,
      messagingServicesFixed: serviceFixCount,
      messagingServices: messagingServices.length,
      requiredMessagingEnvPresent: msEnvStatus.filter((m) => m.present).length,
    },
    pinned: {
      twimlAppSid: twimlAppSid || null,
      twimlAppFound,
      verifySid: verifySid || null,
      verifyServiceFound,
    },
    messagingServiceEnv: msEnvStatus,
    messagingServicesRequired: requiredMsSids.map((sid) => {
      const svc = serviceBySid.get(sid);
      return {
        sid,
        found: Boolean(svc),
        friendlyName: svc?.friendlyName || null,
        inboundRequestUrl: svc?.inboundRequestUrl || null,
        fallbackUrl: svc?.fallbackUrl || null,
        statusCallback: svc?.statusCallback || null,
        checks: {
          inboundUrlOk: svc?.inboundRequestUrl === expected.smsUrl,
          fallbackUrlOk: svc?.fallbackUrl === expected.smsFallbackUrl,
          statusCallbackOk: svc?.statusCallback === expected.smsStatusCallback,
        },
      };
    }),
    numbers: numberRows,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err: any) => {
  console.error(`telephony_audit:error:${err?.message || err}`);
  process.exit(1);
});

