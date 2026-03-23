/**
 * NOVA guest verification — single service for SMS OTP + session rows.
 * Used by HTTP routes and hospitality tools (no direct Twilio in tools).
 */

import crypto from "crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { guestVerificationSessions, siteConfigs } from "@shared/schema";
import { checkVerification, isVerifyConfigured, sendVerification } from "../twilio";
import { normalizePhoneE164, phoneDigitsMatch } from "../utils/phoneNormalize";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export type SiteVerificationSkills = {
  guestPhoneActive: boolean;
  checkInActive: boolean;
};

export function getVerificationSkillsFromSiteConfig(config: unknown): SiteVerificationSkills {
  const c = config as Record<string, unknown> | null | undefined;
  const skills = (c?.skills as Record<string, unknown>) || {};
  const vg = skills.verification_guest_phone as { status?: string } | undefined;
  const vci = skills.verification_check_in as { status?: string } | undefined;
  return {
    guestPhoneActive: vg?.status === "active",
    checkInActive: vci?.status === "active",
  };
}

export async function loadSiteConfigRow(siteConfigId: string) {
  const [row] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
  return row;
}

/** True if either skill requires OTP before PMS guest lookup by phone. */
export function siteRequiresOtpForGuestPmsLookup(skills: SiteVerificationSkills): boolean {
  return skills.guestPhoneActive || skills.checkInActive;
}

export async function guestVerificationStart(params: {
  siteConfigId: string;
  phone: string;
  flowType: "guest_phone" | "guest_checkin";
}): Promise<{ ok: boolean; sessionId?: string; devMode?: boolean; error?: string }> {
  const phoneE164 = normalizePhoneE164(params.phone);
  if (phoneE164.length < 12) return { ok: false, error: "Invalid phone number." };

  const site = await loadSiteConfigRow(params.siteConfigId);
  if (!site) return { ok: false, error: "Site not found." };

  if (!isVerifyConfigured()) {
    const [row] = await db
      .insert(guestVerificationSessions)
      .values({
        siteConfigId: params.siteConfigId,
        phoneE164,
        flowType: params.flowType,
        otpVerified: false,
      })
      .returning({ id: guestVerificationSessions.id });
    console.log(`[novaGuestVerification] Dev mode — mock session ${row?.id} for ${phoneE164}`);
    return { ok: true, sessionId: row?.id, devMode: true };
  }

  try {
    await sendVerification(phoneE164);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return { ok: false, error: msg };
  }

  const [row] = await db
    .insert(guestVerificationSessions)
    .values({
      siteConfigId: params.siteConfigId,
      phoneE164,
      flowType: params.flowType,
      otpVerified: false,
    })
    .returning({ id: guestVerificationSessions.id });

  return { ok: true, sessionId: row?.id };
}

export async function guestVerificationComplete(params: {
  siteConfigId: string;
  phone: string;
  code: string;
  sessionId?: string;
}): Promise<{
  ok: boolean;
  verificationToken?: string;
  expiresAt?: string;
  error?: string;
}> {
  const phoneE164 = normalizePhoneE164(params.phone);
  if (!isVerifyConfigured()) {
    if (params.code !== "000000") {
      return { ok: false, error: "Dev mode: use code 000000" };
    }
  } else {
    const check = await checkVerification(phoneE164, params.code.trim());
    if (!check.valid) return { ok: false, error: "Invalid or expired code." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const exp = new Date(Date.now() + TOKEN_TTL_MS);

  let sessionId = params.sessionId;
  if (sessionId) {
    await db
      .update(guestVerificationSessions)
      .set({
        otpVerified: true,
        verificationTokenHash: tokenHash,
        tokenExpiresAt: exp,
        phoneE164,
        updatedAt: new Date(),
      })
      .where(
        and(eq(guestVerificationSessions.id, sessionId), eq(guestVerificationSessions.siteConfigId, params.siteConfigId)),
      );
  } else {
    const [latest] = await db
      .select()
      .from(guestVerificationSessions)
      .where(
        and(
          eq(guestVerificationSessions.siteConfigId, params.siteConfigId),
          eq(guestVerificationSessions.phoneE164, phoneE164),
        ),
      )
      .orderBy(desc(guestVerificationSessions.createdAt))
      .limit(1);
    if (latest) {
      sessionId = latest.id;
      await db
        .update(guestVerificationSessions)
        .set({
          otpVerified: true,
          verificationTokenHash: tokenHash,
          tokenExpiresAt: exp,
          updatedAt: new Date(),
        })
        .where(eq(guestVerificationSessions.id, latest.id));
    } else {
      const [inserted] = await db
        .insert(guestVerificationSessions)
        .values({
          siteConfigId: params.siteConfigId,
          phoneE164,
          otpVerified: true,
          verificationTokenHash: tokenHash,
          tokenExpiresAt: exp,
          flowType: "guest_phone",
        })
        .returning({ id: guestVerificationSessions.id });
      sessionId = inserted?.id;
    }
  }

  return {
    ok: true,
    verificationToken: token,
    expiresAt: exp.toISOString(),
  };
}

/**
 * Returns true if this phone has a completed OTP for this site within token TTL.
 */
export async function hasRecentGuestVerification(siteConfigId: string, phone: string): Promise<boolean> {
  const e164 = normalizePhoneE164(phone);
  const now = new Date();
  const rows = await db
    .select()
    .from(guestVerificationSessions)
    .where(
      and(
        eq(guestVerificationSessions.siteConfigId, siteConfigId),
        eq(guestVerificationSessions.otpVerified, true),
        gt(guestVerificationSessions.tokenExpiresAt, now),
      ),
    )
    .orderBy(desc(guestVerificationSessions.updatedAt))
    .limit(5);

  return rows.some((r) => phoneDigitsMatch(r.phoneE164, e164));
}

/** Tool-facing: send OTP using same path as HTTP. */
export async function toolGuestPhoneVerification(args: {
  action: "send_otp" | "verify_otp";
  phone?: string;
  otp_code?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {
  const siteId = args._sessionSiteConfigId;
  if (!siteId) return { success: false, error: "Missing site context." };
  if (!args.phone?.trim()) return { success: false, error: "phone is required." };

  if (args.action === "send_otp") {
    const r = await guestVerificationStart({
      siteConfigId: siteId,
      phone: args.phone,
      flowType: "guest_phone",
    });
    if (!r.ok) return { success: false, error: r.error };
    return {
      success: true,
      sessionId: r.sessionId,
      devMode: r.devMode,
      message: r.devMode
        ? "Dev mode: use code 000000 to verify."
        : "A verification code was sent to the guest's phone via SMS.",
    };
  }

  const r = await guestVerificationComplete({
    siteConfigId: siteId,
    phone: args.phone,
    code: args.otp_code || "",
  });
  if (!r.ok) return { success: false, error: r.error };
  return {
    success: true,
    verified: true,
    message: "Phone verified for this session.",
  };
}
