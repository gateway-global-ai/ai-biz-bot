/**
 * claimRoutes.ts — Site Assignment & Claim Flow
 *
 * Admin/reseller assigns a generated website to a business owner's phone.
 * Owner receives SMS → previews site → pays $49.99 → account is created/linked.
 *
 * Routes:
 *   POST /api/admin/sites/:siteId/assign   — send invite SMS with claim token
 *   GET  /api/claim/:token                 — public: validate token + return preview data
 *   POST /api/claim/:token/send-otp        — send OTP to the assigned phone
 *   POST /api/claim/:token/verify-otp      — verify OTP + create Stripe Checkout
 *   POST /api/claim/:token/checkout        — (alt) direct checkout if already verified
 *
 * Stripe webhook (registered in routes.ts) handles checkout.session.completed
 * to finalize activation.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { siteConfigs, customerAccounts } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { invalidateSiteRuntimeCache } from "../services/siteRuntimeResolver";
import { sendSms, getTwilioFromPhoneNumber, sendVerification, checkVerification } from "../twilio";
import { getStripeClient, STRIPE_PRICE_IDS } from "../stripeClient";
import { storage } from "../storage";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** Express `req.params` values are `string | string[]`; Drizzle `eq()` needs a single string. */
function paramString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function buildClaimUrl(req: Request, token: string): string {
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host || "localhost:3004";
  return `${protocol}://${host}/claim/${token}`;
}

function buildPreviewUrl(req: Request, siteId: string): string {
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host || "localhost:3004";
  return `${protocol}://${host}/chat/customer?siteId=${siteId}`;
}

// ── Middleware: lightweight admin/reseller auth check ──────────────────────────
function requireAdminOrReseller(req: Request, res: Response, next: () => void): void {
  // Accept Bearer token (customer session with admin role) or x-admin-token header
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  const bearerToken = (req.headers.authorization || "").replace("Bearer ", "").trim();

  if (adminToken) { next(); return; }

  if (bearerToken) {
    storage.getValidAuthSession(bearerToken)
      .then((session) => {
        if (session) { next(); return; }
        // Fall through to customer session check
        return storage.getValidCustomerSession(bearerToken);
      })
      .then((session) => {
        if (session) { next(); return; }
        res.status(401).json({ error: "Admin or reseller authentication required" });
      })
      .catch(() => res.status(401).json({ error: "Authentication check failed" }));
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}

// ── POST /api/admin/sites/:siteId/assign ─────────────────────────────────────
// Assign a site to a phone number and dispatch the claim invite SMS.
router.post(
  "/api/admin/sites/:siteId/assign",
  requireAdminOrReseller as any,
  async (req: Request, res: Response) => {
    try {
      const siteId = paramString(req.params.siteId);
      const { phone, message: customMessage } = req.body as { phone?: string; message?: string };

      if (!siteId) {
        return res.status(400).json({ error: "siteId is required" });
      }

      if (!phone) {
        return res.status(400).json({ error: "phone is required" });
      }

      const normalizedPhone = normalizePhone(phone);

      // Fetch the site
      const [site] = await db
        .select()
        .from(siteConfigs)
        .where(eq(siteConfigs.id, siteId))
        .limit(1);

      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      if (site.claimStatus === "claimed") {
        return res.status(409).json({ error: "This site has already been claimed" });
      }

      // Generate a secure token valid for 7 days
      const claimToken = crypto.randomBytes(32).toString("hex");
      const claimTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db
        .update(siteConfigs)
        .set({
          claimToken,
          claimTokenExpiresAt,
          assignedToPhone: normalizedPhone,
          claimStatus: "invite_sent",
          updatedAt: new Date(),
        })
        .where(eq(siteConfigs.id, siteId));
      invalidateSiteRuntimeCache(siteId);

      // Build URLs
      const claimUrl  = buildClaimUrl(req, claimToken);
      const previewUrl = buildPreviewUrl(req, siteId);
      const businessName = site.name;

      // Compose SMS — two-part: preview first, then CTA
      const smsBody = customMessage
        ? `${customMessage}\n\nPreview: ${previewUrl}\nClaim & activate: ${claimUrl}`
        : [
            `Hi! Your AI-powered website for "${businessName}" is ready. 🎉`,
            ``,
            `👀 Preview it here:`,
            previewUrl,
            ``,
            `✅ Claim & activate your site for $49.99:`,
            claimUrl,
            ``,
            `This link expires in 7 days. Reply STOP to opt out.`,
          ].join("\n");

      const fromNumber = await getTwilioFromPhoneNumber();
      let smsSent = false;
      let smsSid: string | undefined;

      if (fromNumber) {
        const result = await sendSms(normalizedPhone, smsBody, fromNumber);
        smsSid = result.sid;
        smsSent = true;
      }

      console.log(
        `[Claim] Invite sent for site ${siteId} → ${normalizedPhone} | smsSent=${smsSent} | token=${claimToken.slice(0, 8)}…`
      );

      res.json({
        success: true,
        claimToken,
        claimUrl,
        previewUrl,
        smsSent,
        smsSid,
        assignedToPhone: normalizedPhone,
        expiresAt: claimTokenExpiresAt,
      });
    } catch (err: any) {
      console.error("[Claim] assign error:", err);
      res.status(500).json({ error: err.message || "Failed to send invite" });
    }
  }
);

// ── GET /api/claim/:token ─────────────────────────────────────────────────────
// Public endpoint — validates token and returns safe preview data.
router.get("/api/claim/:token", async (req: Request, res: Response) => {
  try {
    const token = paramString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const [site] = await db
      .select({
        id:              siteConfigs.id,
        name:            siteConfigs.name,
        placeId:         siteConfigs.placeId,
        placeData:       siteConfigs.placeData,
        assignedToPhone: siteConfigs.assignedToPhone,
        claimStatus:     siteConfigs.claimStatus,
        claimTokenExpiresAt: siteConfigs.claimTokenExpiresAt,
        heroImageUrl:    siteConfigs.heroImageUrl,
        domain:          siteConfigs.domain,
      })
      .from(siteConfigs)
      .where(
        and(
          eq(siteConfigs.claimToken, token),
          gt(siteConfigs.claimTokenExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!site) {
      return res.status(404).json({
        error: "This claim link is invalid or has expired.",
        expired: true,
      });
    }

    if (site.claimStatus === "claimed") {
      return res.status(410).json({
        error: "This website has already been claimed.",
        claimed: true,
        siteId: site.id,
      });
    }

    // Return public preview data — no internal IDs beyond what's needed
    res.json({
      valid: true,
      site: {
        id:          site.id,
        name:        site.name,
        placeId:     site.placeId,
        heroImageUrl: site.heroImageUrl,
        domain:      site.domain,
        // Mask the phone to last 4 digits for display
        assignedPhone: site.assignedToPhone
          ? `***-***-${site.assignedToPhone.slice(-4)}`
          : null,
      },
      claimStatus:    site.claimStatus,
      expiresAt:      site.claimTokenExpiresAt,
    });
  } catch (err: any) {
    console.error("[Claim] token lookup error:", err);
    res.status(500).json({ error: "Failed to validate claim link" });
  }
});

// ── POST /api/claim/:token/send-otp ──────────────────────────────────────────
// Sends an OTP to the assigned phone to verify identity before checkout.
router.post("/api/claim/:token/send-otp", async (req: Request, res: Response) => {
  try {
    const token = paramString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const [site] = await db
      .select({
        id:              siteConfigs.id,
        name:            siteConfigs.name,
        assignedToPhone: siteConfigs.assignedToPhone,
        claimStatus:     siteConfigs.claimStatus,
        claimTokenExpiresAt: siteConfigs.claimTokenExpiresAt,
      })
      .from(siteConfigs)
      .where(
        and(
          eq(siteConfigs.claimToken, token),
          gt(siteConfigs.claimTokenExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!site) {
      return res.status(404).json({ error: "Invalid or expired claim link" });
    }
    if (site.claimStatus === "claimed") {
      return res.status(410).json({ error: "Site already claimed" });
    }
    if (!site.assignedToPhone) {
      return res.status(400).json({ error: "No phone number on file for this invite" });
    }

    await sendVerification(site.assignedToPhone);

    res.json({
      success: true,
      phone: `***-***-${site.assignedToPhone.slice(-4)}`,
    });
  } catch (err: any) {
    console.error("[Claim] send-otp error:", err);
    res.status(500).json({ error: err.message || "Failed to send OTP" });
  }
});

// ── POST /api/claim/:token/verify-otp ────────────────────────────────────────
// Verifies OTP, creates/finds customer account, and returns a Stripe Checkout URL.
router.post("/api/claim/:token/verify-otp", async (req: Request, res: Response) => {
  try {
    const token = paramString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }
    const { code, name, email } = req.body as { code?: string; name?: string; email?: string };

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    // Validate token
    const [site] = await db
      .select()
      .from(siteConfigs)
      .where(
        and(
          eq(siteConfigs.claimToken, token),
          gt(siteConfigs.claimTokenExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!site) {
      return res.status(404).json({ error: "Invalid or expired claim link" });
    }
    if (site.claimStatus === "claimed") {
      return res.status(410).json({ error: "Site already claimed" });
    }
    if (!site.assignedToPhone) {
      return res.status(400).json({ error: "No phone on file for this invite" });
    }

    // Verify OTP via Twilio Verify
    const verifyResult = await checkVerification(site.assignedToPhone, code);
    if (!verifyResult.valid) {
      return res.status(401).json({ error: "Invalid or expired verification code" });
    }

    // Find or create customer account for this phone
    let account = await storage.getCustomerAccountByPhone(site.assignedToPhone);
    if (!account) {
      account = await storage.createCustomerAccount({
        phone: site.assignedToPhone,
        name:  name   || null,
        email: email  || null,
        plan:  "free",
        isActive: true,
      });
      console.log(`[Claim] Created customer account ${account.id} for ${site.assignedToPhone}`);
    } else if (name || email) {
      // Opportunistically update name/email if provided
      await storage.updateCustomerAccount(account.id, {
        ...(name  ? { name }  : {}),
        ...(email ? { email } : {}),
      });
    }

    // Mark site as payment_pending
    await db
      .update(siteConfigs)
      .set({ claimStatus: "payment_pending", updatedAt: new Date() })
      .where(eq(siteConfigs.id, site.id));
    invalidateSiteRuntimeCache(site.id);

    // Build Stripe Checkout session
    const stripe = getStripeClient();
    const priceId = STRIPE_PRICE_IDS.claim_activation;

    const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
    const host     = req.headers.host || "localhost:3004";
    const baseUrl  = `${protocol}://${host}`;

    const checkoutParams: any = {
      mode: "payment",
      line_items: [{
        quantity: 1,
        ...(priceId
          ? { price: priceId }
          : {
              price_data: {
                currency:     "usd",
                unit_amount:  4999, // $49.99 fallback when no Price ID configured
                product_data: { name: `AI Website Activation — ${site.name}` },
              },
            }),
      }],
      success_url: `${baseUrl}/claim/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/claim/${token}?cancelled=1`,
      metadata: {
        claimToken:  token,
        siteId:      site.id,
        customerId:  account.id,
        phone:       site.assignedToPhone,
        category:    "platform",
      },
      client_reference_id: site.id,
    };

    // Pre-fill customer email if available
    if (account.email) checkoutParams.customer_email = account.email;

    const session = await stripe.checkout.sessions.create(checkoutParams);

    // Store the Checkout session ID so the webhook can look up the site
    await db
      .update(siteConfigs)
      .set({ claimCheckoutSessionId: session.id, updatedAt: new Date() })
      .where(eq(siteConfigs.id, site.id));
    invalidateSiteRuntimeCache(site.id);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[Claim] verify-otp error:", err);
    res.status(500).json({ error: err.message || "Failed to create checkout session" });
  }
});

// ── GET /api/claim/:token/success ─────────────────────────────────────────────
// Called after successful Stripe payment (as a JSON API; the webhook does the
// actual activation, but this endpoint lets the frontend poll for readiness).
router.get("/api/claim/:token/success", async (req: Request, res: Response) => {
  try {
    const token = paramString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const [site] = await db
      .select({
        id:          siteConfigs.id,
        name:        siteConfigs.name,
        claimStatus: siteConfigs.claimStatus,
        ownerId:     siteConfigs.ownerId,
        claimedAt:   siteConfigs.claimedAt,
      })
      .from(siteConfigs)
      .where(eq(siteConfigs.claimToken, token))
      .limit(1);

    if (!site) return res.status(404).json({ error: "Token not found" });

    res.json({
      claimed:     site.claimStatus === "claimed",
      claimStatus: site.claimStatus,
      siteId:      site.id,
      siteName:    site.name,
      claimedAt:   site.claimedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as claimRoutes };

// ── Stripe webhook handler (exported separately, called from registerRoutes) ───
/**
 * Called by the Stripe webhook handler when checkout.session.completed fires
 * for a claim_activation payment.  Activates the site and links it to the owner.
 */
export async function handleClaimCheckoutCompleted(session: {
  id: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  const { claimToken, siteId, customerId } = session.metadata ?? {};
  if (!claimToken || !siteId || !customerId) return;

  try {
    // Link site to the customer account and mark as claimed
    await db
      .update(siteConfigs)
      .set({
        ownerId:     customerId,
        claimStatus: "claimed",
        claimedAt:   new Date(),
        plan:        "pro",  // Activation grants the Pro plan
        chatbotEnabled: true,
        voiceConciergeEnabled: true,
        updatedAt:   new Date(),
      })
      .where(eq(siteConfigs.id, siteId));
    invalidateSiteRuntimeCache(siteId);

    console.log(`[Claim] Site ${siteId} activated for customer ${customerId}`);

    // Send a welcome SMS
    const [site] = await db
      .select({ name: siteConfigs.name, assignedToPhone: siteConfigs.assignedToPhone })
      .from(siteConfigs)
      .where(eq(siteConfigs.id, siteId))
      .limit(1);

    if (site?.assignedToPhone) {
      const fromNumber = await getTwilioFromPhoneNumber();
      if (fromNumber) {
        await sendSms(
          site.assignedToPhone,
          [
            `🎉 Welcome to Gateway Global AI!`,
            ``,
            `Your website "${site.name}" is now LIVE and activated.`,
            ``,
            `Log in to manage your site anytime:`,
            `https://aibizbot.gatewayglobal.ai/my-account`,
          ].join("\n"),
          fromNumber
        );
      }
    }
  } catch (err) {
    console.error("[Claim] handleClaimCheckoutCompleted error:", err);
  }
}
