/**
 * Inspect & Wire Twilio Senders — Gateway Global AI
 *
 * Two-mode operational script for wiring phone numbers to Messaging Services
 * and correcting voice webhooks. Follows the same pattern as wire-messaging-service-webhooks.ts.
 *
 * INSPECT mode (default) — no changes, read-only:
 *   doppler run -- npx tsx scripts/inspect-and-wire-senders.ts
 *
 * WIRE mode — assigns PN* senders to each Platform MS and fixes voice webhook:
 *   doppler run -- npx tsx scripts/inspect-and-wire-senders.ts --wire
 *
 * Phone number resolution priority per service:
 *   1. TWILIO_PN_<SERVICE>    — explicit PN* SID if set
 *   2. TWILIO_MS_<SERVICE>_NUM — phone number string → lookup PN* SID via Twilio API
 *   3. TWILIO_PHONE_NUMBER     — fallback for Platform Care / Platform Mktg
 *
 * CUSTOMER_OTP is intentionally skipped — OTP uses Twilio Verify (VA*), not a Messaging Service.
 */

import twilio from "twilio";

const WIRE_MODE = process.argv.includes("--wire");

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;

// APP_URL in Doppler may be the full inbound webhook URL or just the base domain.
// We only need the origin (https://domain) for constructing webhook paths.
function resolveAppOrigin(): string {
  const raw = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://aibizbot-dev.gatewayglobal.ai";
  }
}
const APP_URL = resolveAppOrigin();

// ── 6 Sovereign SMS Router pipes ────────────────────────────────────────────

const SERVICES: {
  key:       string;         // TWILIO_MS_* env key
  label:     string;
  pnKey?:    string;         // TWILIO_PN_* explicit SID env key
  numKey?:   string;         // TWILIO_MS_*_NUM phone number string env key
  fallback?: string;         // env key to fall back to (phone number string)
  skipOtp:   boolean;        // skip wiring (handled by Verify API)
}[] = [
  {
    key:     "TWILIO_MS_PLATFORM_OTP",
    label:   "GGW Platform OTP",
    pnKey:   "TWILIO_PN_PLATFORM_OTP",
    numKey:  "TWILIO_MS_PLATFORM_OTP_NUM",
    skipOtp: false,
  },
  {
    key:      "TWILIO_MS_PLATFORM_CARE",
    label:    "GGW Platform Care",
    pnKey:    "TWILIO_PN_PLATFORM_CARE",
    fallback: "TWILIO_PHONE_NUMBER",
    skipOtp:  false,
  },
  {
    key:      "TWILIO_MS_PLATFORM_MKTG",
    label:    "GGW Platform Marketing",
    pnKey:    "TWILIO_PN_PLATFORM_MKTG",
    fallback: "TWILIO_PHONE_NUMBER",
    skipOtp:  false,
  },
  {
    key:     "TWILIO_MS_CUSTOMER_OTP",
    label:   "GGW Customer OTP",
    skipOtp: true,  // Uses Twilio Verify VA* — no sender needed
  },
  {
    key:     "TWILIO_MS_CUSTOMER_CARE",
    label:   "GGW Customer Care",
    pnKey:   "TWILIO_PN_CUSTOMER_CARE",
    skipOtp: false,
  },
  {
    key:     "TWILIO_MS_CUSTOMER_MKTG",
    label:   "GGW Customer Marketing",
    pnKey:   "TWILIO_PN_CUSTOMER_MKTG",
    skipOtp: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneNumber(num: string): string {
  // Normalise to E.164 for Twilio API lookups
  const digits = num.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return num.startsWith("+") ? num : `+${digits}`;
}

/** Look up the PN* SID for a phone number string via Twilio API. */
async function lookupPhoneSid(
  client: ReturnType<typeof twilio>,
  phoneNumber: string
): Promise<string | null> {
  try {
    const normalised = formatPhoneNumber(phoneNumber);
    const results = await client.incomingPhoneNumbers.list({ phoneNumber: normalised, limit: 1 });
    return results[0]?.sid ?? null;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.error("[inspect-and-wire] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN (run with doppler run --)");
    process.exit(1);
  }

  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  const mode = WIRE_MODE ? "WIRE" : "INSPECT";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Twilio Inspect & Wire — MODE: ${mode}`);
  console.log(`  APP_URL: ${APP_URL}`);
  console.log(`${"=".repeat(60)}\n`);

  // ── 1. List all incoming phone numbers ──────────────────────────────────

  console.log("1. Incoming Phone Numbers in Account:");
  console.log("─".repeat(60));
  const allNumbers = await client.incomingPhoneNumbers.list({ limit: 50 });

  if (allNumbers.length === 0) {
    console.log("   (none found)");
  } else {
    for (const n of allNumbers) {
      const sms   = n.capabilities?.sms   ? "✓ SMS" : "✗ SMS";
      const voice = n.capabilities?.voice ? "✓ Voice" : "✗ Voice";
      console.log(`   ${n.phoneNumber}  SID=${n.sid}  [${sms}, ${voice}]  "${n.friendlyName}"`);
      console.log(`      Voice URL: ${n.voiceUrl || "(not set)"}`);
      console.log(`      SMS URL:   ${n.smsUrl   || "(not set — or handled by MS)"}`);
    }
  }
  console.log();

  // ── 2. List all MS* Messaging Services and their current senders ─────────

  console.log("2. Messaging Services & Current Senders:");
  console.log("─".repeat(60));

  for (const svc of SERVICES) {
    const msSid = process.env[svc.key];
    if (!msSid) {
      console.log(`   ${svc.label} (${svc.key}): NOT SET IN DOPPLER`);
      continue;
    }

    let senders: string[] = [];
    try {
      const pns = await client.messaging.v1.services(msSid).phoneNumbers.list({ limit: 20 });
      senders = pns.map((p: any) => `${p.phoneNumber} (${p.sid})`);
    } catch (err: any) {
      console.log(`   ${svc.label}: ERROR fetching senders — ${err.message}`);
      continue;
    }

    if (svc.skipOtp) {
      console.log(`   ${svc.label} (${msSid}): SKIPPED — uses Twilio Verify VA*`);
    } else if (senders.length === 0) {
      console.log(`   ${svc.label} (${msSid}): ⚠ NO SENDERS — Error 21704 risk`);
    } else {
      console.log(`   ${svc.label} (${msSid}): ${senders.join(", ")}`);
    }
  }
  console.log();

  // ── 3. Resolve phone number → PN* SID for each service ──────────────────

  console.log("3. Phone Number Resolution:");
  console.log("─".repeat(60));

  const resolutions: {
    svc:   typeof SERVICES[0];
    msSid: string;
    pnSid: string | null;
    phone: string | null;
    source: string;
  }[] = [];

  for (const svc of SERVICES) {
    const msSid = process.env[svc.key];
    if (!msSid || svc.skipOtp) {
      if (svc.skipOtp) console.log(`   ${svc.label}: SKIPPED (Verify VA*)`);
      else console.log(`   ${svc.label}: SKIPPED (${svc.key} not set)`);
      continue;
    }

    let pnSid:  string | null = null;
    let phone:  string | null = null;
    let source: string        = "none";

    // Priority 1: explicit PN* SID
    if (svc.pnKey) {
      const val = process.env[svc.pnKey];
      if (val && val.startsWith("PN")) {
        pnSid  = val;
        source = `${svc.pnKey} (direct SID)`;
      }
    }

    // Priority 2: phone number string → lookup PN* SID
    if (!pnSid && svc.numKey) {
      const numVal = process.env[svc.numKey];
      if (numVal) {
        phone  = numVal;
        pnSid  = await lookupPhoneSid(client, numVal);
        source = `${svc.numKey}=${numVal} → lookup`;
      }
    }

    // Priority 3: fallback phone number
    if (!pnSid && svc.fallback) {
      const fallbackVal = process.env[svc.fallback];
      if (fallbackVal) {
        phone  = fallbackVal;
        pnSid  = await lookupPhoneSid(client, fallbackVal);
        source = `${svc.fallback}=${fallbackVal} (fallback) → lookup`;
      }
    }

    if (pnSid) {
      console.log(`   ${svc.label}: PN=${pnSid}  source=${source}`);
    } else {
      console.log(`   ${svc.label}: ✗ NO PHONE RESOLVED  source=${source || "no vars set"}`);
    }

    resolutions.push({ svc, msSid, pnSid, phone, source });
  }
  console.log();

  // ── 4. INSPECT-only: print Doppler template ──────────────────────────────

  if (!WIRE_MODE) {
    const missingPn = resolutions.filter(r => !r.pnSid);
    if (missingPn.length > 0) {
      console.log("4. Doppler vars to set (for services without resolved numbers):");
      console.log("─".repeat(60));
      console.log("   # Find the PN* SIDs from section 1 above and run:");
      for (const r of missingPn) {
        const pnKey = r.svc.pnKey || `TWILIO_PN_${r.svc.key.replace("TWILIO_MS_", "")}`;
        console.log(`   doppler secrets set ${pnKey}="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`);
      }
      console.log();
    } else {
      console.log("4. All Platform services have phone numbers resolved. Ready to wire.");
      console.log("   Run with --wire to apply changes.\n");
    }

    console.log("   To fix voice webhooks and wire senders:");
    console.log(`   doppler run -- npx tsx scripts/inspect-and-wire-senders.ts --wire\n`);
    return;
  }

  // ── 5. WIRE mode: assign PN* senders to each Messaging Service ──────────

  console.log("4. Wiring Phone Numbers to Messaging Services:");
  console.log("─".repeat(60));

  for (const r of resolutions) {
    if (!r.pnSid) {
      console.log(`   SKIP ${r.svc.label}: no phone number resolved`);
      continue;
    }

    try {
      await client.messaging.v1.services(r.msSid)
        .phoneNumbers.create({ phoneNumberSid: r.pnSid });
      console.log(`   OK   ${r.svc.label} ← ${r.pnSid}`);
    } catch (err: any) {
      // 21710 = phone number already in this messaging service (idempotent)
      if (err?.code === 21710 || err?.message?.includes("already exists")) {
        console.log(`   SKIP ${r.svc.label} ← ${r.pnSid} (already assigned)`);
      } else {
        console.error(`   FAIL ${r.svc.label} ← ${r.pnSid}: ${err?.message}`);
      }
    }
  }
  console.log();

  // ── 6. WIRE mode: fix voice webhooks on all numbers ─────────────────────

  console.log("5. Fixing Voice Webhooks:");
  console.log("─".repeat(60));

  const voiceUrl    = `${APP_URL}/webhook/voice/stream`;
  const statusUrl   = `${APP_URL}/webhook/voice/status`;
  const inboundSms  = `${APP_URL}/api/webhooks/twilio/incoming`;

  for (const num of allNumbers) {
    const currentVoiceUrl = num.voiceUrl || "";
    const needsVoiceFix   = !currentVoiceUrl.includes(APP_URL.replace("https://", "").replace("http://", ""));

    if (needsVoiceFix) {
      try {
        await client.incomingPhoneNumbers(num.sid).update({
          voiceUrl,
          voiceFallbackUrl: voiceUrl,
          statusCallback:   statusUrl,
          voiceMethod:      "POST" as any,
        });
        console.log(`   OK   ${num.phoneNumber} (${num.sid})`);
        console.log(`         Voice URL → ${voiceUrl}`);
        console.log(`         Status    → ${statusUrl}`);
      } catch (err: any) {
        console.error(`   FAIL ${num.phoneNumber}: ${err?.message}`);
      }
    } else {
      console.log(`   SKIP ${num.phoneNumber} — voice URL already points to ${APP_URL}`);
    }
  }
  console.log();

  // ── 7. Summary ──────────────────────────────────────────────────────────

  console.log("=".repeat(60));
  console.log("  Wire complete. Verify in Twilio Console:");
  console.log("  https://console.twilio.com/us1/develop/phone-numbers/manage/incoming");
  console.log();
  console.log("  Expected result:");
  console.log("  - Each Platform MS* has at least one phone number sender");
  console.log("  - All numbers have voice webhook → " + voiceUrl);
  console.log("  - SMS still handled by Messaging Service (MS*)");
  console.log("=".repeat(60));
  console.log();
}

main().catch((err) => {
  console.error("[inspect-and-wire] Fatal error:", err);
  process.exit(1);
});
