/**
 * NOVA Sovereign Identity & Billing Suite — API bridge
 * Spec: .system_design/nova_sovereign_ruleset_v1.yaml
 * Gate 1: X-Nova-Signature + replay. Gate 2: receive_id_analysis. Gate 3: push_invoice. Gate 4: dashboard session.
 */

import { Router, type Request, type Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../db";
import { novaIdvSessions, siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { invalidateSiteRuntimeCache } from "../services/siteRuntimeResolver";
import {
  buildCanonical,
  verifyReplayTimestamp,
  verifyNovaSignature,
  loadPublicKey,
} from "../utils/novaSignature";
import { generateInvoice } from "../services/novaInvoiceService";
import { requireAuth } from "../auth";
import { sendVerification, checkVerification, isVerifyConfigured } from "../twilio";
import { getStripeClient, STRIPE_PRICE_IDS } from "../stripeClient";
import { resolveDocumentProfile } from "../services/novaDocumentService";
import { storage } from "../storage";

/** Express `req.params` values are `string | string[]`; Drizzle `eq()` needs a single string. */
function paramString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const router = Router();

// --- Gate 1: Security perimeter (skip for dashboard) ---
router.use((req: Request, res: Response, next) => {
  // /dashboard and /verify paths are browser-callable; skip HMAC gate
  if (req.path.startsWith("/dashboard")) return next();
  if (req.path.startsWith("/verify")) return next();

  const signature = req.headers["x-nova-signature"] as string | undefined;
  const timestamp = req.headers["x-nova-timestamp"] as string | undefined;
  const businessId = req.headers["x-nova-business-id"] as string | undefined;
  const protocolLevel = req.headers["x-nova-protocol-level"] as string | undefined;

  if (!timestamp || !businessId || !protocolLevel) {
    return res.status(401).json({ error: "Missing X-Nova-Timestamp, X-Nova-Business-ID, or X-Nova-Protocol-Level" });
  }

  const replay = verifyReplayTimestamp(timestamp);
  if (!replay.ok) {
    return res.status(403).json({ error: replay.error ?? "Replay check failed" });
  }

  const publicKey = loadPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: "NOVA_RSA_PUBLIC_KEY not configured" });
  }

  if (!signature) {
    return res.status(401).json({ error: "Missing X-Nova-Signature" });
  }

  const pathname = (req.baseUrl || "") + (req.path || "");
  const body = typeof req.body === "object" ? JSON.stringify(req.body) : (req.body ?? "");
  const canonical = buildCanonical(req.method, pathname, timestamp, body);

  if (!verifyNovaSignature(canonical, signature, publicKey)) {
    return res.status(403).json({ error: "Invalid X-Nova-Signature" });
  }

  (req as any).novaBusinessId = businessId;
  (req as any).novaProtocolLevel = protocolLevel;
  next();
});

// --- Gate 2: POST /api/nova/billing/receive (receive_id_analysis) ---
router.post("/billing/receive", async (req: Request, res: Response) => {
  const operation = (req.body as any)?.operation;
  if (operation === "receive_id_analysis") {
    const sessionId = (req.body as any)?.session_id;
    const payload = (req.body as any)?.payload;
    if (!sessionId || !payload || typeof payload.isVerified !== "boolean") {
      return res.status(400).json({ error: "receive_id_analysis requires session_id and payload.isVerified" });
    }
    try {
      await db
        .update(novaIdvSessions)
        .set({
          idVerified: payload.isVerified,
          updatedAt: new Date(),
        })
        .where(eq(novaIdvSessions.sessionId, sessionId));
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[NOVA] receive_id_analysis update error:", e);
      return res.status(500).json({ error: "Failed to update session" });
    }
  }
  // Other operations: 501 until implemented
  return res.status(501).json({
    error: "Not implemented",
    message: `Operation "${operation}" — see nova_sovereign_ruleset_v1.yaml`,
  });
});

// --- Gate 3: POST /api/nova/billing/push (push_invoice) ---
router.post("/billing/push", async (req: Request, res: Response) => {
  const operation = (req.body as any)?.operation;
  if (operation === "push_invoice") {
    const category = (req.body as any)?.category;
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "push_invoice requires category" });
    }
    const invoice = generateInvoice(category);
    if (!invoice) {
      return res.status(400).json({ error: "Unknown category or no template" });
    }
    return res.status(200).json(invoice);
  }
  return res.status(501).json({
    error: "Not implemented",
    message: `Operation "${operation}" — see nova_sovereign_ruleset_v1.yaml`,
  });
});

// --- Gate 4: GET /api/nova/dashboard/session/:sessionId (requireAuth) ---
function getProtocolSteps(protocolLevel: number): string[] {
  const root = process.cwd();
  const filePath = path.join(root, ".system_design", "nova_sovereign_ruleset_v1.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(raw) as any;
  const protocols = data?.nova_sovereign_config?.idv_protocols;
  if (!protocols) return [];
  const key = protocolLevel === 7 ? "level_7" : protocolLevel === 5 ? "level_5" : "level_1";
  return protocols[key]?.steps ?? [];
}

router.get("/dashboard/session/:sessionId", requireAuth, async (req: any, res: Response) => {
  const sessionId = paramString(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  try {
    const rows = await db
      .select()
      .from(novaIdvSessions)
      .where(eq(novaIdvSessions.sessionId, sessionId))
      .limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Session not found" });
    const steps = getProtocolSteps(row.protocolLevel);
    let currentStepIndex = steps.length - 1;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s === "OTP_Verify" && !row.otpVerified) { currentStepIndex = i; break; }
      if (s === "MagicLink_Sent" && !row.magicLinkVerified) { currentStepIndex = i; break; }
      if (s === "Biometric" && !row.biometricVerified) { currentStepIndex = i; break; }
      if (s === "ID_Analysis" && !row.idVerified) { currentStepIndex = i; break; }
      if (s === "Signature" && !row.signatureUrl) { currentStepIndex = i; break; }
    }
    return res.status(200).json({
      session_id: row.sessionId,
      business_id: row.businessId,
      client_phone: row.clientPhone,
      client_email: row.clientEmail,
      protocol_level: row.protocolLevel,
      otp_verified: row.otpVerified,
      magic_link_verified: row.magicLinkVerified,
      biometric_verified: row.biometricVerified,
      id_verified: row.idVerified,
      signature_url: row.signatureUrl,
      invoice_id: row.invoiceId,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      steps,
      currentStepIndex: Math.min(currentStepIndex, steps.length - 1),
    });
  } catch (e) {
    console.error("[NOVA] dashboard session error:", e);
    return res.status(500).json({ error: "Failed to load session" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Nova Verify Gateway — lightweight OTP-based OS entry gate
// These routes bypass Gate 1 (no RSA header required) because they are
// initiated directly from the ConciergePanel in the browser, not server-to-server.
// They wrap the existing Twilio Verify + claim flow from claimRoutes.ts.
// ─────────────────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

// POST /api/nova/verify/start — send OTP for claim or sign-in
router.post("/verify/start", async (req: Request, res: Response) => {
  const { phone, siteConfigId, mode } = req.body as {
    phone: string;
    siteConfigId?: string;
    mode?: "claim" | "signin";
  };
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const normalized = normalizePhone(phone);

  if (!isVerifyConfigured()) {
    // Dev mode: skip Twilio, return a mock session
    const mockSessionId = randomUUID();
    console.log(`[NOVA Gate] Dev mode — skipping Twilio OTP for ${normalized}`);
    return res.json({ ok: true, sessionId: mockSessionId, devMode: true });
  }

  try {
    await sendVerification(normalized);
    const sessionId = randomUUID();
    return res.json({ ok: true, sessionId });
  } catch (e: any) {
    console.error("[NOVA Gate] sendVerification error:", e);
    return res.status(500).json({ error: e.message || "Failed to send code" });
  }
});

// POST /api/nova/verify/complete — verify OTP, find/create account, return token
router.post("/verify/complete", async (req: Request, res: Response) => {
  const { phone, code, siteConfigId, mode, sessionId } = req.body as {
    phone: string;
    code: string;
    siteConfigId?: string;
    mode?: "claim" | "signin";
    sessionId?: string;
  };
  if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

  const normalized = normalizePhone(phone);

  // Dev mode bypass: accept code "000000"
  if (!isVerifyConfigured() && code !== "000000") {
    return res.status(401).json({ error: "Dev mode: use code 000000" });
  }

  if (isVerifyConfigured()) {
    try {
      const result = await checkVerification(normalized, code);
      if (!result.valid) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }
    } catch (e: any) {
      return res.status(401).json({ error: e.message || "Verification failed" });
    }
  }

  try {
    // Find or create admin user (owner account) by phone
    let adminUser = await storage.getAdminUserByPhone(normalized);
    if (!adminUser) {
      try {
        adminUser = await storage.createAdminUser({
          phone: normalized,
          name: null,
          role: "owner",
          isActive: true,
        });
      } catch {
        adminUser = undefined;
      }
    }

    if (!adminUser) {
      return res.status(500).json({ error: "Failed to resolve account" });
    }

    if (mode === "signin") {
      // Generate session token and return immediately
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createAuthSession({ adminUserId: adminUser.id, token, expiresAt });
      return res.json({ ok: true, token, userId: adminUser.id });
    }

    // Claim mode — identity verified; return userId for billing step
    return res.json({ ok: true, userId: adminUser.id, verified: true });
  } catch (e: any) {
    console.error("[NOVA Gate] verify/complete error:", e);
    return res.status(500).json({ error: e.message || "Account resolution failed" });
  }
});

// POST /api/nova/verify/activate — create Stripe checkout for claim activation
router.post("/verify/activate", async (req: Request, res: Response) => {
  const { siteConfigId, sessionId } = req.body as {
    siteConfigId?: string;
    sessionId?: string;
  };

  if (!siteConfigId) return res.status(400).json({ error: "siteConfigId required" });

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      // No Stripe configured — activate directly (dev/demo mode)
      await db
        .update(siteConfigs)
        .set({ workspaceState: "claimed", claimedAt: new Date(), plan: "pro" } as any)
        .where(eq(siteConfigs.id, siteConfigId));
      invalidateSiteRuntimeCache(siteConfigId);
      return res.json({ ok: true, activated: true });
    }

    const appUrl = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";
    const priceId = (STRIPE_PRICE_IDS as any).claim_activation || (STRIPE_PRICE_IDS as any).platform_monthly;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "usd",
                product_data: { name: "Gateway Global AI — Platform Plan" },
                unit_amount: 9900,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
      success_url: `${appUrl}/agent/${siteConfigId}?activated=1`,
      cancel_url: `${appUrl}/agent/${siteConfigId}?cancelled=1`,
      metadata: { siteConfigId, source: "nova_gate" },
    });

    return res.json({ ok: true, checkoutUrl: session.url });
  } catch (e: any) {
    console.error("[NOVA Gate] activate error:", e);
    return res.status(500).json({ error: e.message || "Activation failed" });
  }
});

// GET /api/nova/documents/:siteConfigId — return document profile for a site
// Public (no Nova header required) — data is non-sensitive industry templates
router.get("/documents/:siteConfigId", async (req: Request, res: Response) => {
  const siteConfigId = paramString(req.params.siteConfigId);
  if (!siteConfigId) return res.status(400).json({ error: "siteConfigId required" });

  try {
    const rows = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId)).limit(1);
    const site = rows[0];
    if (!site) return res.status(404).json({ error: "Site not found" });

    const placeData = (site as any).placeData;
    const placeTypes: string[] = placeData?.types ?? [];
    const profile = resolveDocumentProfile(placeTypes);
    return res.json(profile);
  } catch (e: any) {
    console.error("[NOVA] documents error:", e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
