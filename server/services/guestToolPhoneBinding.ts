/**
 * Binds guest_phone_verification and pms_lookup_guest_journey to Twilio signaling ANI
 * when present — model-supplied phone numbers are not authoritative on PSTN.
 *
 * Canonical policy: docs-governance/canonical/SESSION_IDENTITY_BINDING_SPEC.md
 * New identity-sensitive tools must extend the protected-tool pattern here — not reimplement ad hoc.
 */
import { z } from "zod";
import { normalizePhoneE164, phoneDigitsMatch } from "../utils/phoneNormalize";

export const guestPhoneVerificationModelSchema = z
  .object({
    action: z.enum(["send_otp", "verify_otp"]),
    phone: z.string().optional(),
    otp_code: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action === "verify_otp") {
      const code = val.otp_code?.trim();
      if (!code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "otp_code is required when action is verify_otp",
          path: ["otp_code"],
        });
      }
    }
  });

export const pmsLookupGuestJourneyModelSchema = z.object({
  phone: z.string().optional(),
});

export type GuestPhoneBindingContext = {
  trustedCallerId?: string | null;
  callSid?: string | null;
};

export type BoundPhoneResult =
  | { ok: true; phone: string; source: "pstn_trusted_caller" | "model_args" }
  | { ok: false; error: string };

/**
 * When `trustedCallerId` is set (PSTN / bridged session), always use it for guest tools.
 * Logs if the model suggested a different number (possible prompt injection / social engineering).
 */
export function resolveBoundPhoneForGuestTools(
  modelPhone: string | undefined,
  ctx: GuestPhoneBindingContext,
): BoundPhoneResult {
  const trusted = ctx.trustedCallerId?.trim();
  if (trusted) {
    const bound = normalizePhoneE164(trusted);
    if (bound.length < 12) {
      return {
        ok: false,
        error: "Inbound caller ID is not a valid phone for verification or PMS lookup.",
      };
    }
    const suggested = modelPhone?.trim();
    if (suggested) {
      const sugNorm = normalizePhoneE164(suggested);
      if (sugNorm && !phoneDigitsMatch(sugNorm, bound)) {
        console.warn(
          `[GuestToolPhone] Ignoring model phone on PSTN session callSid=${ctx.callSid ?? "n/a"} — using Twilio From`,
        );
      }
    }
    return { ok: true, phone: trusted, source: "pstn_trusted_caller" };
  }

  const raw = modelPhone?.trim();
  if (!raw) {
    return {
      ok: false,
      error:
        "phone is required when the session has no inbound PSTN caller ID (e.g. browser voice).",
    };
  }
  const normalized = normalizePhoneE164(raw);
  if (normalized.length < 12) {
    return { ok: false, error: "Invalid phone number." };
  }
  return { ok: true, phone: raw, source: "model_args" };
}
