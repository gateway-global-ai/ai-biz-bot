/**
 * Session identity binding scenarios for guest phone tools.
 * No DB. Run: npx tsx tests/test-guest-tool-phone-binding.ts
 * Or: npm run test:guest-tool-phone-binding
 */

import {
  guestPhoneVerificationModelSchema,
  pmsLookupGuestJourneyModelSchema,
  resolveBoundPhoneForGuestTools,
} from "../server/services/guestToolPhoneBinding.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const ctxPstn = { trustedCallerId: "+15551234567", callSid: "CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };

  // 1) Trusted ANI, no model phone
  {
    const r = resolveBoundPhoneForGuestTools(undefined, ctxPstn);
    assert(r.ok && r.source === "pstn_trusted_caller", "1: expected PSTN bind without model phone");
    assert(r.ok && r.phone === "+15551234567", "1: phone");
  }

  // 2) Trusted ANI, matching model phone (same 10 digits)
  {
    const r = resolveBoundPhoneForGuestTools("(555) 123-4567", ctxPstn);
    assert(r.ok && r.phone === "+15551234567", "2: should bind to trusted");
  }

  // 3) Trusted ANI, different model phone → ignore model, warn
  {
    const warns: string[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]) => {
      warns.push(a.map(String).join(" "));
    };
    try {
      const r = resolveBoundPhoneForGuestTools("+19997654321", ctxPstn);
      assert(r.ok && r.phone === "+15551234567", "3: trusted wins");
      assert(warns.some((w) => w.includes("Ignoring model phone")), "3: mismatch warn");
    } finally {
      console.warn = orig;
    }
  }

  // 4) No trusted ANI, valid model phone
  {
    const r = resolveBoundPhoneForGuestTools("5551234567", {});
    assert(r.ok && r.source === "model_args", "4: model path");
    assert(r.ok && r.phone === "5551234567", "4: raw model phone passed through");
  }

  // 5) No trusted ANI, missing phone
  {
    const r = resolveBoundPhoneForGuestTools(undefined, {});
    assert(!r.ok && r.error.includes("required"), "5: missing phone");
  }

  // 6) verify_otp without otp_code
  {
    const p = guestPhoneVerificationModelSchema.safeParse({
      action: "verify_otp",
      phone: "5551234567",
    });
    assert(!p.success, "6: zod should reject missing otp_code");
  }

  // 6b) send_otp without otp_code — ok
  {
    const p = guestPhoneVerificationModelSchema.safeParse({ action: "send_otp" });
    assert(p.success, "6b: send_otp allows missing otp_code");
  }

  // 7) Invalid E.164 — trusted too short
  {
    const r = resolveBoundPhoneForGuestTools(undefined, { trustedCallerId: "123" });
    assert(!r.ok && r.error.includes("not a valid phone"), "7: short trusted");
  }

  // 7b) Invalid model phone without trusted
  {
    const r = resolveBoundPhoneForGuestTools("12", {});
    assert(!r.ok && r.error.includes("Invalid"), "7b: invalid model");
  }

  // 8) pms schema empty object ok
  {
    const p = pmsLookupGuestJourneyModelSchema.safeParse({});
    assert(p.success, "8: pms schema allows empty");
  }

  console.log("✅ test-guest-tool-phone-binding: all scenarios passed");
}

main();
