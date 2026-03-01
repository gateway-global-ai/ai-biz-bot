import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { registerVlmRoutes } from "./vlm-routes";
import { registerAgentRoutes } from "./agents/agent-routes";
import { registerWorkspaceOnboardingRoutes } from "./routes/workspace-onboarding";
import knowledgeRoutes from "./routes/knowledge-routes";
import businessRoutes from "./routes/businessRoutes";
import siteConfigRoutes from "./routes/siteConfigRoutes";
import { claimRoutes, handleClaimCheckoutCompleted } from "./routes/claimRoutes";
import ingestPlanRoutes from "./routes/ingestPlanRoutes";
import bailRescueRoutes from "./routes/bailRescueRoutes";
import agentResearchRoutes from "./routes/agentResearch";
import novaSovereignRouter from "./routes/novaSovereignRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";
import { registerMenuRoutes } from "./routes/menu-routes";
import healthRoutes from "./routes/healthRoutes";
import { registerInquiryRoutes } from "./routes/inquiry-routes";
import { registerB2bRoutes } from "./routes/b2b-routes";
import telephonyRoutes from "./routes/telephonyRoutes"; // Platinum Core: Telephony, Voice, SMS, Webhooks, TTS, PTT
import twilio from "twilio";
import { 
  searchAvailableNumbers, 
  provisionPhoneNumber, 
  releasePhoneNumber, 
  updatePhoneNumberWebhooks,
  getIncomingPhoneNumbers,
  sendSms,
  makeCall,
  getCallLogs as getTwilioCallLogs,
  getMessageLogs,
  updateCallerIdName,
  getTwilioFromPhoneNumber,
  getTwilioClient,
  createSubAccountAndProvisionNumber
} from "./twilio";
import { insertTelephonyConfigSchema, insertCallLogSchema, insertAgentSchema, insertCustomerSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, PLAN_LIMITS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat } from "./ai-gateway"; // Sovereign: Gemini sole provider
import { sendOtp, verifyOtp, verifySession, logout, requireAuth } from "./auth";
import { customerSendOtp, customerVerifyOtp, customerVerifySession, customerLogout, customerUpdateProfile, customerGetBusinesses, customerClaimBusiness } from "./customerAuth";
import { runDemoEnrichment } from "./services/demo-enrichment";
import { generateFullReport } from "./services/reviewAnalysisService";
import { enrichBusinessData } from "./services/businessDataService";
import { buildRichSystemInstruction } from "./services/systemInstructionBuilder";
import { getFreshPlaceId, getFreshPlaceIdWithSource } from "./services/placeDiscoveryService";
import { enrichBusinessProfile } from "./services/enrichBusinessProfile";
import { handleAdminToolCall, ADMIN_TOOL_DEFINITIONS } from "./tools/adminToolHandlers";
// kimiK2Server removed — Kimi MCP routes decommissioned (see /api/mcp/* stubs below)
import { GoogleWorkspaceService, createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "./mcp/googleWorkspace";
import { computeInsights, generateOwnerReport, generateMarketingSearch, formatOwnerReportForSms, formatOwnerReportForChat, formatMarketingReportForSms, formatMarketingReportForChat, lookupPlaceByName, milesToMeters, type ComputeInsightsRequest, type OwnerReportRequest, type MarketingSearchRequest } from "./mcp/placesAggregate";
import { getAvailableApis, calculateCosts, generateRateLimits, generatePricingStrategy, compareApis, type ApiUsageScenario } from "./mcp/googleApiAnalyst";
import { placesCache, CACHE_TTL } from "./placesCache";
import crypto from "crypto";
import { db } from "./db";
import { workspaceConfigurations, analyticsLogs } from "@shared/schema";
import { logVoiceUsage, hasEnergyBalance, getEnergyBalance, getVoiceUsageLogs } from "./services/energy-monitor";
import { eq } from "drizzle-orm";


// schemas moved to telephonyRoutes.ts

const SOCIAL_CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Pinterest|Googlebot|bingbot|Discordbot|vkShare/i;

const DEFAULT_OG: Record<string, string> = {
  ogTitle: "Free Custom Websites, AI Voice and Chat Enabled",
  ogDescription: "We support small business owners with free websites, enabled with voice AI agents, AI chat bots, and beautiful modern designs. Websites are free. No Credit card required.",
  ogUrl: "http://aibizbot.gatewayglobal.ai",
  ogImage: "http://aibizbot.gatewayglobal.ai/og-image.png",
  ogType: "website",
  ogSiteName: "AI Biz Bot by Gateway Global",
  twitterCard: "summary_large_image",
};

function buildOgHtml(og: Record<string, string>): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>${og.ogTitle || DEFAULT_OG.ogTitle}</title>
<meta name="description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta property="og:title" content="${og.ogTitle || DEFAULT_OG.ogTitle}"/>
<meta property="og:description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta property="og:url" content="${og.ogUrl || DEFAULT_OG.ogUrl}"/>
<meta property="og:image" content="${og.ogImage || DEFAULT_OG.ogImage}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:type" content="${og.ogType || DEFAULT_OG.ogType}"/>
<meta property="og:site_name" content="${og.ogSiteName || DEFAULT_OG.ogSiteName}"/>
<meta name="twitter:card" content="${og.twitterCard || DEFAULT_OG.twitterCard}"/>
<meta name="twitter:title" content="${og.ogTitle || DEFAULT_OG.ogTitle}"/>
<meta name="twitter:description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta name="twitter:image" content="${og.ogImage || DEFAULT_OG.ogImage}"/>
</head><body></body></html>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  function isAdminAuthenticated(req: any): boolean {
    const adminSession = req.headers?.["x-admin-token"];
    if (adminSession) return true;
    const cookieHeader: string | undefined = req.headers?.cookie;
    const sessionCookie = cookieHeader?.split(";").find((c) => c.trim().startsWith("admin_session="));
    return !!sessionCookie;
  }

  // Health check route (public)
  app.use(healthRoutes);

  // Platinum Core: Telephony, Voice, SMS, Webhooks, TTS, PTT
  app.use(telephonyRoutes);

  app.use(async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_CRAWLER_UA.test(ua)) return next();
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.match(/\.\w+$/)) return next();

    try {
      const pagePath = req.path === "/" ? "/" : req.path.replace(/\/$/, "");
      const dbOg = await storage.getOgSettingsByPath(pagePath);
      const og = dbOg ? {
        ogTitle: dbOg.ogTitle,
        ogDescription: dbOg.ogDescription,
        ogUrl: dbOg.ogUrl || DEFAULT_OG.ogUrl,
        ogImage: dbOg.ogImage || DEFAULT_OG.ogImage,
        ogType: dbOg.ogType || DEFAULT_OG.ogType,
        ogSiteName: dbOg.ogSiteName || DEFAULT_OG.ogSiteName,
        twitterCard: dbOg.twitterCard || DEFAULT_OG.twitterCard,
      } : DEFAULT_OG;
      res.status(200).set({ "Content-Type": "text/html" }).end(buildOgHtml(og));
    } catch (err) {
      console.error("[OG] Crawler middleware error:", err);
      res.status(200).set({ "Content-Type": "text/html" }).end(buildOgHtml(DEFAULT_OG));
    }
  });

  // Admin Auth routes
  app.post("/api/auth/send-otp", sendOtp);
  app.post("/api/auth/verify-otp", verifyOtp);
  app.get("/api/auth/session", verifySession);
  app.post("/api/auth/logout", logout);

  // Plans endpoint (public - accessible by AI agents, dashboard, and external consumers)
  app.get("/api/plans", (_req, res) => {
    res.json({ plans: PLAN_LIMITS });
  });

  // Customer Auth routes (separate from admin)
  app.post("/api/customer/send-otp", customerSendOtp);
  app.post("/api/customer/verify-otp", customerVerifyOtp);
  app.get("/api/customer/session", customerVerifySession);
  app.post("/api/customer/logout", customerLogout);
  app.patch("/api/customer/profile", customerUpdateProfile);
  app.get("/api/customer/businesses", customerGetBusinesses);
  app.post("/api/customer/claim-business", customerClaimBusiness);

  // ============ Reseller (Stripe Connect) ============
  app.post("/api/reseller/onboard", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      let resellerId = (adminUser as any).resellerId ?? null;
      let reseller = resellerId ? await storage.getResellerById(resellerId) : null;
      if (!reseller) {
        const created = await storage.createReseller({ name: adminUser.name ?? undefined, phone: adminUser.phone ?? undefined });
        reseller = created;
        resellerId = created.id;
        await storage.updateAdminUser(adminUser.id, { resellerId });
      }
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      if (reseller.stripeConnectId) {
        const link = await stripe.accountLinks.create({
          account: reseller.stripeConnectId,
          refresh_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?refresh=1`,
          return_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?success=1`,
          type: "account_onboarding",
        });
        return res.json({ url: link.url });
      }
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: (adminUser as any).email ?? undefined,
        capabilities: { transfers: { requested: true } },
      });
      await storage.updateReseller(reseller.id, { stripeConnectId: account.id });
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?refresh=1`,
        return_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?success=1`,
        type: "account_onboarding",
      });
      res.json({ url: link.url });
    } catch (e: any) {
      console.error("[Reseller] onboard error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Onboarding failed" });
    }
  });

  app.get("/api/reseller/status", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      const resellerId = (adminUser as any).resellerId ?? null;
      if (!resellerId) return res.status(403).json({ error: "Reseller account not linked" });
      const reseller = await storage.getResellerById(resellerId);
      if (!reseller?.stripeConnectId) return res.json({ stripeConnectId: null, balance: null });
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      const balance = await stripe.balance.retrieve({ stripeAccount: reseller.stripeConnectId });
      const available = (balance.available?.[0]?.amount ?? 0) / 100;
      res.json({ stripeConnectId: reseller.stripeConnectId, balance: available });
    } catch (e: any) {
      console.error("[Reseller] status error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to load status" });
    }
  });

  app.get("/api/reseller/commissions", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      const resellerId = (adminUser as any).resellerId ?? null;
      if (!resellerId) return res.status(403).json({ error: "Reseller account not linked" });
      const { db } = await import("./db");
      const { commissions: commissionsTable } = await import("@shared/schema");
      const list = await db.select().from(commissionsTable).where(eq(commissionsTable.resellerId, resellerId));
      const totalEarnings = list.reduce((s, c) => s + Number(c.commission), 0);
      const activeClients = new Set(list.map((c) => c.siteConfigId).filter(Boolean)).size;
      const energyBounties = list.filter((c) => c.type === "REFILL").reduce((s, c) => s + Number(c.commission), 0);
      res.json({
        commissions: list.map((c) => ({
          id: c.id,
          siteConfigId: c.siteConfigId,
          amount: Number(c.amount),
          commission: Number(c.commission),
          type: c.type,
          status: c.status,
          createdAt: c.createdAt,
        })),
        totalEarnings,
        activeClients,
        energyBounties,
      });
    } catch (e: any) {
      console.error("[Reseller] commissions error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to load commissions" });
    }
  });

  app.post("/api/reseller/track-intent", async (req, res) => {
    try {
      const body = req.body as { platformId?: string; roomType?: string; netPrice?: number };
      const { platformId, roomType, netPrice } = body;
      if (!platformId || netPrice == null) {
        return res.json({ tracked: false, estimatedCommission: 0 });
      }
      const siteConfigId = await storage.getSiteConfigIdByPlatformId(platformId);
      if (!siteConfigId) return res.json({ tracked: false, estimatedCommission: 0 });
      const site = await storage.getSiteConfigById(siteConfigId);
      const resellerId = (site as any)?.resellerId ?? null;
      if (!resellerId) return res.json({ tracked: false, estimatedCommission: 0 });
      const amount = Number(netPrice) || 0;
      const estimatedCommission = Math.round(amount * 0.1 * 100) / 100;
      res.json({ tracked: true, estimatedCommission });
    } catch (e: any) {
      console.error("[Reseller] track-intent error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to track intent" });
    }
  });

  // ============ Demo Lead / Magic Link Onboarding ============

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  const demoCreateSchema = z.object({
    phone: z.string().min(7).max(20),
    businessName: z.string().min(1).max(500),
    businessAddress: z.string().max(500).optional().nullable(),
    placeId: z.string().max(200).optional().nullable(),
    placeData: z.any().optional().nullable(),
  });

  app.post("/api/demo/create", async (req, res) => {
    try {
      const parsed = demoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Phone number and business name are required" });
      }
      const { phone, businessName, businessAddress, placeId, placeData } = parsed.data;

      const normalizedPhone = normalizePhone(phone);
      const magicToken = crypto.randomBytes(32).toString("hex");
      const magicTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const lead = await storage.createDemoLead({
        phone: normalizedPhone,
        businessName,
        businessAddress: businessAddress || null,
        placeId: placeId || null,
        placeData: placeData || null,
        magicToken,
        magicTokenExpiresAt,
        magicTokenUsed: false,
        demoStartedAt: new Date(),
        demoReadyAt: null,
        status: "preview",
        name: null,
      });

      let existingSite: any = null;
      if (placeId) {
        existingSite = await storage.getSiteConfigByPlaceId(placeId);
      }
      if (!existingSite) {
        const customerAccount = await storage.getCustomerAccountByPhone(normalizedPhone);

        const domain = businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);

        const siteConfig = await storage.createSiteConfig({
          name: businessName,
          domain,
          placeId: placeId || null,
          placeData: placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
        });
        console.log(`[Demo] Created site_config ${siteConfig.id} for "${businessName}"${customerAccount ? ` (linked to customer ${customerAccount.id})` : " (no customer account yet)"}`);
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const magicLink = `${protocol}://${host}/demo?token=${magicToken}`;

      const fromNumber = await getTwilioFromPhoneNumber();
      if (fromNumber) {
        await sendSms(
          normalizedPhone,
          `Welcome to Gateway Global AI!\n\nYour free AI-powered website for "${businessName}" is being built right now.\n\nClick here to access your site anytime:\n${magicLink}\n\nNo login needed - this link is your key.`,
          fromNumber
        );
      }

      res.json({
        success: true,
        leadId: lead.id,
        magicToken,
        magicLink,
        smsSent: !!fromNumber,
      });
    } catch (error: any) {
      console.error("[Demo] Create error:", error);
      res.status(500).json({ error: error.message || "Failed to create demo" });
    }
  });

  const requestAccessSchema = z.object({
    phone: z.string().min(7).max(20),
    businessName: z.string().min(1).max(500),
    businessAddress: z.string().max(500).optional().nullable(),
    placeId: z.string().max(200).optional().nullable(),
    placeData: z.any().optional().nullable(),
  });

  app.post("/api/demo/request-access", async (req, res) => {
    try {
      const parsed = requestAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Phone number and business name are required" });
      }
      const { phone, businessName, businessAddress, placeId, placeData } = parsed.data;
      const normalizedPhone = normalizePhone(phone);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode({ phone: normalizedPhone, code, expiresAt });

      const magicToken = crypto.randomBytes(32).toString("hex");
      const lead = await storage.createDemoLead({
        phone: normalizedPhone,
        businessName,
        businessAddress: businessAddress || null,
        placeId: placeId || null,
        placeData: placeData || null,
        magicToken,
        magicTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        magicTokenUsed: false,
        demoStartedAt: new Date(),
        demoReadyAt: null,
        status: "preview",
        name: null,
      });

      let existingSite = placeId ? await storage.getSiteConfigByPlaceId(placeId) : null;
      if (!existingSite) {
        const customerAccount = await storage.getCustomerAccountByPhone(normalizedPhone);
        const domain = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        await storage.createSiteConfig({
          name: businessName,
          domain,
          placeId: placeId || null,
          placeData: placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
        });
      }

      const fromNumber = await getTwilioFromPhoneNumber();
      if (fromNumber) {
        await sendSms(
          normalizedPhone,
          `Your Gateway verification code is: ${code}\n\nThis code expires in 5 minutes.`,
          fromNumber
        );
      }

      res.json({
        success: true,
        leadId: lead.id,
        phone: normalizedPhone.slice(-4),
      });
    } catch (error: any) {
      console.error("[Demo] Request access error:", error);
      res.status(500).json({ error: error.message || "Failed to send code" });
    }
  });

  const verifyAndEnrichSchema = z.object({
    leadId: z.string(),
    phone: z.string().min(7).max(20),
    code: z.string().length(6),
  });

  app.post("/api/demo/verify-and-enrich", async (req, res) => {
    try {
      const parsed = verifyAndEnrichSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "leadId, phone, and 6-digit code are required" });
      }
      const { leadId, phone, code } = parsed.data;
      const normalizedPhone = normalizePhone(phone);

      const otpRecord = await storage.getValidOtpCode(normalizedPhone, code);
      if (!otpRecord) {
        return res.status(401).json({ error: "Invalid or expired verification code" });
      }
      await storage.markOtpUsed(otpRecord.id);

      let account = await storage.getCustomerAccountByPhone(normalizedPhone);
      if (!account) {
        account = await storage.createCustomerAccount({ phone: normalizedPhone, plan: "free" });
      }
      if (!account.isActive) {
        return res.status(403).json({ error: "Account deactivated" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createCustomerSession({ customerAccountId: account.id, token, expiresAt });
      await storage.updateCustomerAccountLastLogin(account.id);

      try {
        const claimed = await storage.claimUnlinkedSitesByPhone(account.phone, account.id);
        if (claimed > 0) console.log(`[Demo] Auto-claimed ${claimed} site(s) for customer ${account.id}`);
      } catch (_) {}

      const lead = await storage.getDemoLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Demo not found" });
      }

      const placeData = (lead.placeData || {}) as any;
      const site = lead.placeId ? await storage.getSiteConfigByPlaceId(lead.placeId) : null;
      if (site && (placeData.name || lead.businessName)) {
        const geo = placeData.geometry;
        const primaryType =
          placeData.types && Array.isArray(placeData.types)
            ? placeData.types.filter(
                (t: string) => t && t !== "point_of_interest" && t !== "establishment"
              )[0]
            : undefined;
        const enriched = await runDemoEnrichment({
          name: placeData.name || lead.businessName,
          address: placeData.formatted_address || lead.businessAddress || undefined,
          website: placeData.website || placeData.url,
          types: placeData.types,
          reviews: placeData.reviews,
          formatted_phone_number: placeData.formatted_phone_number,
          rating: placeData.rating,
          user_ratings_total: placeData.user_ratings_total,
          latitude: typeof geo?.lat === "number" ? geo.lat : undefined,
          longitude: typeof geo?.lng === "number" ? geo.lng : undefined,
          primaryType: primaryType || undefined,
          placeId: lead.placeId || placeData.place_id || undefined,
        });
        const updatedPlaceData = { ...placeData, enriched };
        await storage.updateSiteConfig(site.id, {
          placeData: updatedPlaceData,
          systemPromptOverride: enriched.systemPromptOverride,
        } as any);
      }

      await storage.updateDemoLead(leadId, { status: "ready", demoReadyAt: new Date() } as any);

      res.json({
        success: true,
        token,
        user: {
          id: account.id,
          phone: account.phone,
          name: account.name,
          email: account.email,
          plan: account.plan,
          planStartedAt: account.planStartedAt,
        },
      });
    } catch (error: any) {
      console.error("[Demo] Verify-and-enrich error:", error);
      res.status(500).json({ error: error.message || "Failed to verify" });
    }
  });

  app.get("/api/demo/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const lead = await storage.getDemoLeadByToken(token);

      if (!lead) {
        return res.status(404).json({ error: "Invalid or expired link" });
      }

      if (lead.magicTokenExpiresAt < new Date()) {
        return res.status(410).json({ error: "This link has expired" });
      }

      if (!lead.magicTokenUsed) {
        await storage.updateDemoLead(lead.id, { magicTokenUsed: true } as any);
      }

      res.json({
        success: true,
        lead: {
          id: lead.id,
          businessName: lead.businessName,
          businessAddress: lead.businessAddress,
          placeId: lead.placeId,
          placeData: lead.placeData,
          status: lead.status,
          name: lead.name,
          demoStartedAt: lead.demoStartedAt,
          demoReadyAt: lead.demoReadyAt,
        },
      });
    } catch (error: any) {
      console.error("[Demo] Verify error:", error);
      res.status(500).json({ error: error.message || "Failed to verify link" });
    }
  });

  // Error Navigator & recovery analytics (bounce prevention, VOICE_TIER_INTEREST)
  app.post("/api/analytics/recovery-success", async (req, res) => {
    try {
      const body = req.body || {};
      const eventType = body.eventType || "RECOVERY_SUCCESS";
      const siteConfigId = body.siteConfigId ?? null;
      const metadata =
        eventType === "RECOVERY_SUCCESS"
          ? {
              errorCode: body.errorCode,
              recoveredPath: body.recoveredPath,
              timeInError: body.timeInError,
            }
          : body.metadata || {};
      await db.insert(analyticsLogs).values({
        siteConfigId,
        eventType,
        metadata,
      });
      res.json({ success: true, message: "Recovery logged." });
    } catch (error: any) {
      console.error("[Analytics] recovery-success error:", error);
      res.status(500).json({ error: "Failed to log recovery" });
    }
  });

  app.post("/api/admin/backfill-sites", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const allLeads = await storage.getAllDemoLeads();
      let created = 0;
      let skipped = 0;
      for (const lead of allLeads) {
        if (lead.placeId) {
          const existing = await storage.getSiteConfigByPlaceId(lead.placeId);
          if (existing) {
            skipped++;
            continue;
          }
        }
        const customerAccount = lead.phone ? await storage.getCustomerAccountByPhone(lead.phone) : null;
        const domain = lead.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);

        await storage.createSiteConfig({
          name: lead.businessName,
          domain,
          placeId: lead.placeId || null,
          placeData: lead.placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${lead.businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
        });
        created++;
      }
      res.json({ success: true, created, skipped, total: allLeads.length });
    } catch (error: any) {
      console.error("[Backfill] Error:", error);
      res.status(500).json({ error: error.message || "Backfill failed" });
    }
  });

  // ===================== Admin System Health Report =====================
  // Runs dependency checks and BI pipeline checks (aligned with tests/test-bi-pipeline.ts).
  app.get("/api/admin/health-report", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

      const defaultPlaceId = "ChIJB4qU6oXvJIgR_2p602OaK_U";
      const placeId =
        (typeof req.query.placeId === "string" && req.query.placeId) ||
        process.env.TEST_PLACE_ID ||
        defaultPlaceId;
      const businessName =
        (typeof req.query.businessName === "string" && req.query.businessName) ||
        process.env.TEST_BUSINESS_NAME ||
        "Boardwalk Suites Lafayette";

      const serpKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
      const { getServerMapsApiKey } = await import("./config/mapsApiKey");
      const googleMapsKey = getServerMapsApiKey();
      const geminiKey = process.env.GEMINI_API_KEY;
      const hasValidPlaceId = placeId.length > 20 && !placeId.includes("...");

      const dependencyChecks: Array<{ name: string; status: "ok" | "missing" | "error"; message?: string }> = [
        { name: "SERP_API_KEY", status: serpKey ? "ok" : "missing", message: serpKey ? undefined : "Set SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY" },
        { name: "Google Maps/Places key", status: googleMapsKey ? "ok" : "missing", message: googleMapsKey ? undefined : "Set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY" },
        { name: "GEMINI_API_KEY", status: geminiKey ? "ok" : "missing", message: geminiKey ? undefined : "Set GEMINI_API_KEY" },
        { name: "TEST_PLACE_ID", status: hasValidPlaceId ? "ok" : "error", message: hasValidPlaceId ? undefined : `Invalid TEST_PLACE_ID format (${placeId})` },
      ];

      const pipelineChecks: Array<{
        name: string;
        status: "pass" | "fail" | "skip";
        message?: string;
        detail?: Record<string, unknown>;
      }> = [];

      const rawMessages: string[] = [];
      const log = (msg: string) => rawMessages.push(msg);

      let enrichmentFailedDueTo404 = false;
      let suggestedPlaceId: string | null = null;

      // Test 1: Review Mining & SWOT Generation (SERP API + Gemini)
      if (!serpKey) {
        pipelineChecks.push({
          name: "Review Mining & SWOT Generation",
          status: "skip",
          message: "SERP API key not set (SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY)",
        });
      } else if (!geminiKey) {
        pipelineChecks.push({
          name: "Review Mining & SWOT Generation",
          status: "skip",
          message: "GEMINI_API_KEY not set (required to analyze reviews)",
        });
      } else {
        try {
          const report = await generateFullReport(placeId, businessName);
          if (!report) throw new Error("Report is null");
          if (!report.executive_summary || report.executive_summary.length === 0) {
            throw new Error("Executive summary is missing or empty");
          }
          if (!report.cinematic_narrative || !report.cinematic_narrative.landing) {
            throw new Error("Cinematic narrative landing is missing");
          }
          const amenityCount = report.amenity_list?.length ?? 0;
          const blindSpotCount = report.owner_insights?.blind_spots?.length ?? 0;
          if (amenityCount === 0) log("WARN: Amenity list empty");
          if (blindSpotCount === 0) log("WARN: Blind spots empty");

          pipelineChecks.push({
            name: "Review Mining & SWOT Generation",
            status: "pass",
            detail: {
              executiveSummaryPreview: report.executive_summary.substring(0, 140),
              amenities: amenityCount,
              blindSpots: blindSpotCount,
            },
          });
        } catch (error: any) {
          pipelineChecks.push({
            name: "Review Mining & SWOT Generation",
            status: "fail",
            message: error?.message || "Failed to generate SWOT report",
          });
        }
      }

      // Test 2: Enriched Business Data (Places API New)
      let placesOk = false;
      if (!googleMapsKey) {
        pipelineChecks.push({
          name: "Enriched Business Data",
          status: "skip",
          message: "Google Maps/Places API key not set (GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)",
        });
      } else if (!hasValidPlaceId) {
        pipelineChecks.push({
          name: "Enriched Business Data",
          status: "skip",
          message: "TEST_PLACE_ID invalid format",
        });
      } else {
        try {
          const enriched = await enrichBusinessData(placeId, {
            includeIntelligence: true,
            includeOwnerData: false,
            businessName,
          });
          if (!enriched?.general) throw new Error("Enriched data missing general section");
          if (!enriched.general.name || !enriched.general.placeId) throw new Error("General business data incomplete");
          placesOk = true;
          pipelineChecks.push({
            name: "Enriched Business Data",
            status: "pass",
            detail: {
              placeId: enriched.general.placeId,
              name: enriched.general.name,
              hasIntelligence: !!enriched.intelligence,
            },
          });
        } catch (error: any) {
          if (error?.response?.status === 404) {
            enrichmentFailedDueTo404 = true;
            suggestedPlaceId = await getFreshPlaceId(businessName);
            pipelineChecks.push({
              name: "Enriched Business Data",
              status: "fail",
              message: "Place ID is obsolete or invalid for Places API (New). Refresh the ID to fix.",
              detail: {
                placeId,
                obsoletePlaceId: true,
                suggestion: "Search for New ID",
                ...(suggestedPlaceId ? { suggestedPlaceId } : {}),
              },
            });
          } else {
            pipelineChecks.push({
              name: "Enriched Business Data",
              status: "fail",
              message: error?.message || "Failed to enrich business data",
            });
          }
        }
      }

      // Test 3: System Instruction Building (requires Places success for BI section)
      if (!googleMapsKey) {
        pipelineChecks.push({
          name: "System Instruction Building",
          status: "skip",
          message: "Google Maps/Places API key not set (GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)",
        });
      } else if (!hasValidPlaceId) {
        pipelineChecks.push({
          name: "System Instruction Building",
          status: "skip",
          message: "TEST_PLACE_ID invalid format",
        });
      } else if (!placesOk) {
        if (enrichmentFailedDueTo404) {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "fail",
            message: "Enrichment failed due to obsolete Place ID (see Enriched Business Data). Refresh the ID to fix.",
            detail: {
              obsoletePlaceId: true,
              suggestion: "Search for New ID",
              ...(suggestedPlaceId ? { suggestedPlaceId } : {}),
            },
          });
        } else {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "skip",
            message: "Skipped because Places enrichment did not succeed (see Enriched Business Data)",
          });
        }
      } else {
        try {
          const instruction = await buildRichSystemInstruction(
            { placeId, name: businessName, address: "Admin health check" } as any,
            {
              role: "Business Assistant",
              personality: "Helpful and professional",
              objectives: ["Assist customers with business information"],
              constraints: ["Be polite and professional"],
            } as any,
            { includeIntelligence: true, includeTourNarrative: true }
          );
          if (!instruction || instruction.length === 0) throw new Error("Instruction is empty");
          if (!instruction.includes(businessName)) throw new Error("Instruction does not include business name");
          if (!instruction.includes("BUSINESS INTELLIGENCE")) {
            throw new Error("Instruction missing BUSINESS INTELLIGENCE section");
          }
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "pass",
            detail: { length: instruction.length },
          });
        } catch (error: any) {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "fail",
            message: error?.message || "Failed to build rich system instruction",
          });
        }
      }

      const passed = pipelineChecks.filter((c) => c.status === "pass").length;
      const failed = pipelineChecks.filter((c) => c.status === "fail").length;
      const skipped = pipelineChecks.filter((c) => c.status === "skip").length;

      res.json({
        timestamp: new Date().toISOString(),
        params: { placeId, businessName },
        dependencyChecks,
        pipelineChecks,
        summary: { passed, failed, skipped },
        rawMessages,
      });
    } catch (error: any) {
      console.error("[AdminHealthReport] Error:", error);
      res.status(500).json({ error: error?.message || "Failed to run health report" });
    }
  });

  // Admin: resolve fresh Place ID for a search signature (for "Search for New ID" in System Health UI).
  app.post("/api/admin/place-discovery", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const body = req.body as { searchSignature?: string };
      const searchSignature =
        typeof body?.searchSignature === "string" ? body.searchSignature.trim() : "";
      if (!searchSignature) {
        return res.status(400).json({ error: "searchSignature is required" });
      }
      const result = await getFreshPlaceIdWithSource(searchSignature);
      res.json({
        placeId: result.placeId,
        source: result.source,
      });
    } catch (error: any) {
      console.error("[AdminPlaceDiscovery] Error:", error);
      res.status(500).json({ error: error?.message || "Place discovery failed" });
    }
  });

  /**
   * Admin: manually trigger business enrichment snapshots via SerpApi.
   *
   * POST /api/admin/enrich-business
   * Body: { platformId: string; maxReviews?: number; force?: boolean }
   *
   * Stores raw SerpApi payloads to platform_business_enrichment_snapshots.
   * Admin-only; never called by voice assistant path.
   */
  // Simple in-memory rate limiter for the enrichment endpoint (expensive SerpApi calls).
  const enrichRateLimits = new Map<string, { count: number; resetTime: number }>();
  const ENRICH_RATE_LIMIT = 10; // requests per minute per IP
  const ENRICH_RATE_WINDOW = 60_000; // 1 minute in ms

  app.post("/api/admin/enrich-business", async (req, res) => {
    try {
      // Rate limiting (checked before auth to prevent brute-force)
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const rateInfo = enrichRateLimits.get(clientIp);
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
        } else if (rateInfo.count >= ENRICH_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
      }

      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

      const schema = z.object({
        platformId: z.string().min(1),
        maxReviews: z.number().int().min(1).max(500).optional(),
        force: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const result = await enrichBusinessProfile(parsed.data);
      const httpStatus = result.status === "failed" ? 422 : 200;
      res.status(httpStatus).json(result);
    } catch (error: any) {
      console.error("[AdminEnrichBusiness] Error:", error);
      res.status(500).json({ error: error?.message || "Enrichment failed" });
    }
  });

  /**
   * Admin: generic admin tool-call endpoint.
   *
   * GET  /api/admin/tool-definitions  – list available admin tools (OpenAI-compatible schema)
   * POST /api/admin/tool-call         – execute a named admin tool
   *   Body: { tool: string; args?: Record<string, unknown> }
   *
   * Admin-only. Rate-limited (shares the enrichment rate-limiter).
   */
  app.get("/api/admin/tool-definitions", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    res.json(ADMIN_TOOL_DEFINITIONS);
  });

  app.post("/api/admin/tool-call", async (req, res) => {
    try {
      // Rate limiting (reuses enrichment limits — same cost boundary)
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const rateInfo = enrichRateLimits.get(clientIp);
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
        } else if (rateInfo.count >= ENRICH_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
      }

      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

      const schema = z.object({
        tool: z.string().min(1),
        args: z.record(z.unknown()).optional().default({}),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await handleAdminToolCall(parsed.data.tool, parsed.data.args, {
        adminId: String(req.headers?.["x-admin-token"] ?? "session"),
        ip: req.ip || req.socket.remoteAddress || "unknown",
      });
      res.json(result);
    } catch (error: any) {
      if (error?.message?.startsWith("Unknown admin tool:")) {
        return res.status(404).json({ error: error.message });
      }
      console.error("[AdminToolCall] Error:", error);
      res.status(500).json({ error: error?.message || "Tool call failed" });
    }
  });

  app.post("/api/demo/:id/update-name", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const updated = await storage.updateDemoLead(id, { name, status: "ready" } as any);
      if (!updated) {
        return res.status(404).json({ error: "Demo not found" });
      }
      res.json({ success: true, lead: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update" });
    }
  });

  // Gemini API key endpoint (for client-side Gemini Live)
  app.get("/api/gemini-key", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    res.json({ apiKey });
  });

  // ============ Google Places Details (comprehensive) ============
  app.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }
      const { placeId } = req.params;
      const fields = [
        'name', 'formatted_address', 'formatted_phone_number', 'international_phone_number',
        'website', 'url', 'rating', 'user_ratings_total', 'price_level', 'business_status',
        'types', 'opening_hours', 'geometry', 'vicinity', 'utc_offset',
        'address_components', 'plus_code', 'icon', 'icon_mask_base_uri', 'icon_background_color',
        'wheelchair_accessible_entrance', 'delivery', 'dine_in', 'takeout', 'curbside_pickup',
        'reservable', 'serves_beer', 'serves_wine', 'serves_breakfast', 'serves_lunch',
        'serves_dinner', 'serves_brunch', 'serves_vegetarian_food',
        'editorial_summary', 'reviews', 'photos'
      ].join(',');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status !== 'OK') {
        return res.status(400).json({ error: data.status, reviews: [] });
      }
      const result = data.result || {};
      res.json({
        name: result.name,
        formatted_address: result.formatted_address,
        geometry: result.geometry,
        types: result.types,
        opening_hours: result.opening_hours,
        photos: result.photos || [],
        reviews: result.reviews || [],
        user_ratings_total: result.user_ratings_total || 0,
        rating: result.rating || 0,
        price_level: result.price_level,
        business_status: result.business_status,
        url: result.url,
        vicinity: result.vicinity,
        utc_offset: result.utc_offset,
        international_phone_number: result.international_phone_number,
        formatted_phone_number: result.formatted_phone_number,
        website: result.website,
        address_components: result.address_components,
        plus_code: result.plus_code,
        editorial_summary: result.editorial_summary?.overview || null,
        wheelchair_accessible_entrance: result.wheelchair_accessible_entrance,
        delivery: result.delivery,
        dine_in: result.dine_in,
        takeout: result.takeout,
        curbside_pickup: result.curbside_pickup,
        reservable: result.reservable,
        serves_beer: result.serves_beer,
        serves_wine: result.serves_wine,
        serves_breakfast: result.serves_breakfast,
        serves_lunch: result.serves_lunch,
        serves_dinner: result.serves_dinner,
        serves_brunch: result.serves_brunch,
        serves_vegetarian_food: result.serves_vegetarian_food,
      });
    } catch (error: any) {
      console.error("[Places Details] Error:", error.message);
      res.status(500).json({ error: error.message, reviews: [] });
    }
  });

  // Photo proxy: fetch a business hero image by placeId (keeps API key server-side)
  app.get("/api/places/photo-proxy/:placeId", async (req, res) => {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) return res.status(500).send("API key not configured");
    const { placeId } = req.params;
    const maxWidth = Math.min(Number(req.query.maxWidth) || 800, 1200);

    try {
      // Fetch photo_reference from legacy Places Details API
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json() as any;
      const photoRef = detailsData?.result?.photos?.[0]?.photo_reference;
      if (!photoRef) return res.status(404).send("No photo available");

      // Redirect through the Places Photo API (Google handles caching)
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}&key=${apiKey}`;
      const photoRes = await fetch(photoUrl);
      if (!photoRes.ok) return res.status(502).send("Photo fetch failed");

      res.setHeader("Content-Type", photoRes.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24h cache
      const buffer = await photoRes.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Google Places Search - for business discovery (with caching)
  app.post("/api/places/search", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { query, location, radius } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Validate location and radius if provided
      if (location) {
        if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          return res.status(400).json({ error: "Location must have valid latitude and longitude" });
        }
        if (radius !== undefined && (typeof radius !== 'number' || radius <= 0)) {
          return res.status(400).json({ error: "Radius must be a positive number" });
        }
      }

      // Use cache to reduce API calls
      const cacheParams = { query, location, radius };
      const result = await placesCache.getOrFetch(
        'places-search',
        cacheParams,
        async () => {
          // Use the new Places API (Text Search) for better results
          const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.photos,places.primaryType'
            },
            body: JSON.stringify({
              textQuery: query,
              ...(location && { locationBias: { circle: { center: location, radius: radius || 5000 } } })
            })
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('[Places Search] API error:', data);
            throw new Error(data.error?.message || 'Search failed');
          }

          // Transform the new API format to be more user-friendly
          const places = (data.places || []).map((place: any) => ({
            placeId: place.id,
            name: place.displayName?.text || 'Unknown',
            address: place.formattedAddress || '',
            location: place.location,
            rating: place.rating || 0,
            userRatingCount: place.userRatingCount || 0,
            types: place.types || [],
            primaryType: place.primaryType,
            businessStatus: place.businessStatus,
            photos: place.photos?.map((p: any) => p.name) || []
          }));

          return { places, count: places.length };
        },
        CACHE_TTL.PLACE_SEARCH
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Places Search] Error:", error.message);
      res.status(500).json({ error: error.message, places: [] });
    }
  });

  // Google Places Owner Report - competitive analysis (with caching)
  app.post("/api/places/owner-report", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { businessName, radiusMiles } = req.body;

      if (!businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      // Use cache to reduce expensive report generation
      const cacheParams = { businessName, radiusMiles };
      const result = await placesCache.getOrFetch(
        'owner-report',
        cacheParams,
        async () => {
          const report = await generateOwnerReport(
            { mode: 'owner', businessName, radiusMiles },
            apiKey
          );

          return {
            report,
            formatted: {
              sms: formatOwnerReportForSms(report),
              chat: formatOwnerReportForChat(report)
            }
          };
        },
        CACHE_TTL.OWNER_REPORT
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Owner Report] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Google Places Marketing Search - market research (with caching)
  app.post("/api/places/marketing-search", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { address, latitude, longitude, category, radiusMiles, minRating, maxRating, priceLevels } = req.body;

      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      if (!address && (!latitude || !longitude)) {
        return res.status(400).json({ error: "Either address or latitude/longitude is required" });
      }

      // Use cache to reduce API calls
      const cacheParams = { address, latitude, longitude, category, radiusMiles, minRating, maxRating, priceLevels };
      const result = await placesCache.getOrFetch(
        'marketing-search',
        cacheParams,
        async () => {
          const report = await generateMarketingSearch(
            { 
              mode: 'marketing', 
              address, 
              latitude, 
              longitude, 
              category, 
              radiusMiles,
              minRating,
              maxRating,
              priceLevels
            },
            apiKey
          );

          return {
            report,
            formatted: {
              sms: formatMarketingReportForSms(report),
              chat: formatMarketingReportForChat(report)
            }
          };
        },
        CACHE_TTL.MARKETING_SEARCH
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Marketing Search] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Cache management endpoints
  app.get("/api/places/cache/stats", (req, res) => {
    const stats = placesCache.getStats();
    res.json(stats);
  });

  app.post("/api/places/cache/clear", (req, res) => {
    placesCache.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  });

  // ============ Google Workspace Integration (DB-backed by siteConfigId) ============

  async function getWorkspaceCredentialsBySiteConfigId(siteConfigId: string): Promise<GoogleWorkspaceCredentials | null> {
    const row = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      columns: { accessToken: true, refreshToken: true, tokenExpiry: true },
    });
    if (!row?.accessToken) return null;
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken ?? undefined,
      expiryDate: row.tokenExpiry ? new Date(row.tokenExpiry).getTime() : undefined,
    };
  }

  // Check if Google Workspace is configured (env)
  app.get("/api/google/status", (req, res) => {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    res.json({
      configured: hasClientId && hasClientSecret,
      hasClientId,
      hasClientSecret,
    });
  });

  // Workspace status for a site (DB)
  app.get("/api/workspace/status/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const row = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (!row) {
        return res.json({ status: "disconnected", googleEmail: null, enabledApps: {} });
      }
      const enabledApps = (row.enabledApps as Record<string, boolean>) ?? {};
      res.json({
        status: row.status ?? "disconnected",
        googleEmail: row.googleEmail ?? null,
        enabledApps,
      });
    } catch (error: any) {
      console.error("Workspace status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth URL for connecting workspace (state = siteConfigId)
  app.get("/api/workspace/connect/:siteConfigId", (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const service = createGoogleWorkspaceService();
      const authUrl = service.getAuthUrl(siteConfigId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Workspace connect URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy: Get Google Workspace OAuth URL (query siteConfigId)
  app.get("/api/google/auth-url", (req, res) => {
    try {
      const siteConfigId = (req.query.businessId ?? req.query.siteConfigId) as string | undefined;
      if (!siteConfigId || typeof siteConfigId !== "string") {
        return res.status(400).json({ error: "siteConfigId or businessId is required" });
      }
      const service = createGoogleWorkspaceService();
      const authUrl = service.getAuthUrl(siteConfigId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Google auth URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Google OAuth callback (state = siteConfigId); persist tokens to DB
  app.get("/api/google/callback", async (req, res) => {
    try {
      const { code, state: siteConfigId } = req.query;
      if (!code || typeof code !== "string") {
        return res.status(400).send("Authorization code not provided");
      }
      if (!siteConfigId || typeof siteConfigId !== "string") {
        return res.status(400).send("State (siteConfigId) not provided");
      }
      const service = createGoogleWorkspaceService();
      const credentials = await service.exchangeCode(code);
      const tokenExpiry = credentials.expiryDate ? new Date(credentials.expiryDate) : null;
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (existing) {
        await db.update(workspaceConfigurations)
          .set({
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken ?? null,
            tokenExpiry,
            status: "connected",
            statusMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      } else {
        await db.insert(workspaceConfigurations).values({
          siteConfigId,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken ?? null,
          tokenExpiry,
          status: "connected",
          updatedAt: new Date(),
        });
      }
      res.redirect(`/website-builder?google_connected=true&siteConfigId=${siteConfigId}`);
    } catch (error: any) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`/website-builder?google_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Save workspace preferences (enabledApps, etc.)
  app.patch("/api/workspace/save/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { enabledApps, status } = req.body as { enabledApps?: Record<string, boolean>; status?: string };
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (enabledApps !== undefined) updates.enabledApps = enabledApps;
      if (status !== undefined) updates.status = status;
      if (existing) {
        await db.update(workspaceConfigurations).set(updates as any).where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      } else {
        await db.insert(workspaceConfigurations).values({
          siteConfigId,
          ...(enabledApps && { enabledApps }),
          ...(status && { status }),
          updatedAt: new Date(),
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Workspace save error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check if site has Google Workspace connected
  app.get("/api/workspace/connection/:siteConfigId", async (req, res) => {
    const { siteConfigId } = req.params;
    const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
    res.json({ connected: !!credentials });
  });

  app.get("/api/google/connection/:siteConfigId", async (req, res) => {
    const { siteConfigId } = req.params;
    const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
    res.json({ connected: !!credentials });
  });

  // Execute a Google Workspace tool
  app.post("/api/google/execute-tool", async (req, res) => {
    try {
      const { siteConfigId, toolName, args } = req.body as { siteConfigId?: string; businessId?: string; toolName: string; args?: Record<string, unknown> };
      const id = siteConfigId ?? (req.body as any).businessId;
      if (!id) {
        return res.status(400).json({ success: false, error: "siteConfigId is required" });
      }
      if (!toolName) {
        return res.status(400).json({ success: false, error: "toolName is required" });
      }
      const credentials = await getWorkspaceCredentialsBySiteConfigId(id);
      if (!credentials) {
        return res.status(401).json({
          success: false,
          error: "Google Workspace not connected for this site",
          requiresAuth: true,
        });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.executeTool(toolName, args || {});
      res.json(result);
    } catch (error: any) {
      console.error("Google tool execution error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Disconnect Google Workspace (clear tokens, keep row)
  app.delete("/api/workspace/connection/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (!existing) {
        return res.json({ success: true, wasConnected: false });
      }
      await db.update(workspaceConfigurations)
        .set({
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          status: "disconnected",
          googleEmail: null,
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      res.json({ success: true, wasConnected: true });
    } catch (error: any) {
      console.error("Workspace disconnect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/google/connection/:siteConfigId", async (req, res) => {
    const { siteConfigId } = req.params;
    const existing = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    });
    if (!existing) return res.json({ success: true, wasConnected: false });
    await db.update(workspaceConfigurations)
      .set({
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        status: "disconnected",
        googleEmail: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
    res.json({ success: true, wasConnected: true });
  });

  // ============ Google Drive API ============

  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.get("/api/google/drive/drives/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listDrives();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/google/drive/files/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { folderId = 'root', pageToken, pageSize } = req.query;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listDriveFiles(
        folderId as string,
        pageToken as string | undefined,
        pageSize ? parseInt(pageSize as string) : undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google/drive/folder/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { name, parentId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Folder name is required" });
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createDriveFolder(name, parentId || 'root');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google/drive/upload/:siteConfigId", upload.single('file'), async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { parentId } = req.body;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: "No file provided" });
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.uploadDriveFile(file.originalname, file.buffer, file.mimetype, parentId || 'root');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/google/drive/files/:siteConfigId/:fileId", async (req, res) => {
    try {
      const { siteConfigId, fileId } = req.params;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteDriveFile(fileId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Google Calendar API ============

  app.get("/api/google/calendar/events/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { maxResults, timeMin } = req.query;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listCalendarEvents(
        maxResults ? parseInt(maxResults as string) : 20,
        timeMin as string | undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google/calendar/events/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { summary, description, startTime, endTime, attendees } = req.body;
      if (!summary || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: "summary, startTime, and endTime are required" });
      }
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createCalendarEvent({ summary, description, startTime, endTime, attendees });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/google/calendar/events/:siteConfigId/:eventId", async (req, res) => {
    try {
      const { siteConfigId, eventId } = req.params;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.updateCalendarEvent(eventId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/google/calendar/events/:siteConfigId/:eventId", async (req, res) => {
    try {
      const { siteConfigId, eventId } = req.params;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteCalendarEvent(eventId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Google Tasks API ============

  app.get("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { maxResults } = req.query;
      const credentials = googleWorkspaceCredentials.get(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listTasks(maxResults ? parseInt(maxResults as string) : 20);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { title, notes, dueDate } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: "title is required" });
      }
      const credentials = googleWorkspaceCredentials.get(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createTask({ title, notes, dueDate });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const { businessId, taskId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.updateTask(taskId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const { businessId, taskId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteTask(taskId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Places Aggregate API - Business Reports ============

  app.post("/api/reports/compute-insights", async (req, res) => {
    try {
      const { request: insightRequest } = req.body;

      if (!insightRequest || !insightRequest.filter) {
        return res.status(400).json({ success: false, error: "request with filter is required" });
      }

      const result = await computeInsights(insightRequest);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[Places Aggregate] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/reports/business-report", async (req, res) => {
    try {
      const { mode, businessName, address, category, radiusMiles, latitude, longitude, minRating, maxRating, priceLevels } = req.body;

      if (mode === 'marketing') {
        if (!category) {
          return res.status(400).json({ success: false, error: "category is required for marketing search" });
        }
        const report = await generateMarketingSearch({
          mode: 'marketing',
          address: address || businessName,
          latitude,
          longitude,
          category,
          radiusMiles,
          minRating,
          maxRating,
          priceLevels
        });
        res.json({
          success: true,
          report,
          formatted: {
            chat: formatMarketingReportForChat(report),
            sms: formatMarketingReportForSms(report)
          }
        });
      } else {
        const name = businessName || address;
        if (!name) {
          return res.status(400).json({ success: false, error: "businessName is required" });
        }
        const report = await generateOwnerReport({
          mode: 'owner',
          businessName: name,
          radiusMiles
        });
        res.json({
          success: true,
          report,
          formatted: {
            chat: formatOwnerReportForChat(report),
            sms: formatOwnerReportForSms(report)
          }
        });
      }
    } catch (error: any) {
      console.error("[Business Report] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/reports/lookup-place", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: "name is required" });
      }
      const place = await lookupPlaceByName(name);
      if (!place) {
        return res.status(404).json({ success: false, error: `No place found for "${name}"` });
      }
      res.json({ success: true, place });
    } catch (error: any) {
      console.error("[Place Lookup] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google API Analyst routes
  app.get("/api/google-analyst/apis", async (_req, res) => {
    res.json({ success: true, apis: getAvailableApis() });
  });

  app.post("/api/google-analyst/calculate-costs", async (req, res) => {
    try {
      const { scenarios } = req.body as { scenarios: ApiUsageScenario[] };
      if (!scenarios || !Array.isArray(scenarios)) {
        return res.status(400).json({ success: false, error: "scenarios array is required" });
      }
      const result = calculateCosts(scenarios);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google-analyst/analyze", async (req, res) => {
    try {
      const { question, scenarios, conversationHistory } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: "question is required" });
      }

      let context = question;
      if (scenarios && Array.isArray(scenarios)) {
        const costs = calculateCosts(scenarios);
        context += `\n\nCurrent usage data:\n${JSON.stringify(costs, null, 2)}`;
      }

      // Sovereign: Use gatewayChat instead of analyzeWithKimi (Kimi decommissioned)
      const { response: analysis } = await gatewayChat({
        messages: [
          { role: 'system', content: 'You are a Google API cost optimization expert. Provide detailed analysis.' },
          { role: 'user', content: context }
        ],
      });

      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("[Google API Analyst] Analysis error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google-analyst/rate-limits", async (req, res) => {
    try {
      const { scenarios, monthlyBudget } = req.body;
      if (!scenarios || !monthlyBudget) {
        return res.status(400).json({ success: false, error: "scenarios and monthlyBudget are required" });
      }
      const recommendations = await generateRateLimits(scenarios, monthlyBudget);
      res.json({ success: true, recommendations });
    } catch (error: any) {
      console.error("[Google API Analyst] Rate limits error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google-analyst/pricing-strategy", async (req, res) => {
    try {
      const { services, targetMargin } = req.body;
      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ success: false, error: "services array is required" });
      }
      const strategy = await generatePricingStrategy(services, targetMargin || 60);
      res.json({ success: true, strategy });
    } catch (error: any) {
      console.error("[Google API Analyst] Pricing strategy error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google-analyst/compare", async (req, res) => {
    try {
      const { useCase, apiIds } = req.body;
      if (!useCase || !apiIds || !Array.isArray(apiIds)) {
        return res.status(400).json({ success: false, error: "useCase and apiIds array are required" });
      }
      const comparison = await compareApis(useCase, apiIds);
      res.json({ success: true, comparison });
    } catch (error: any) {
      console.error("[Google API Analyst] Compare error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get telephony config
  // ← extracted to server/routes/telephonyRoutes.ts

  // ============================================
  // DISC ASSESSMENT API
  // ============================================

  // Get all DISC word sets (questions)
  app.get("/api/disc/questions", (req, res) => {
    res.json({
      instructions: "Rank each set of four words from 4 (most like you) to 1 (least like you). Use each number once per set.",
      totalSets: DISC_WORD_SETS.length,
      sets: DISC_WORD_SETS,
    });
  });

  // Get a single question set
  app.get("/api/disc/questions/:setNumber", (req, res) => {
    const setNumber = parseInt(req.params.setNumber);
    const wordSet = DISC_WORD_SETS.find(s => s.setNumber === setNumber);
    
    if (!wordSet) {
      return res.status(404).json({ error: `Set ${setNumber} not found. Valid range: 1-24` });
    }
    
    res.json(wordSet);
  });

  // Submit rankings and calculate DISC profile
  const discRankingsSchema = z.object({
    rankings: z.array(z.object({
      setNumber: z.number().min(1).max(24),
      rankings: z.tuple([
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
      ]).refine(
        (arr) => new Set(arr).size === 4,
        { message: "Each ranking (1-4) must be used exactly once per set" }
      ),
    })).length(24),
  });

  app.post("/api/disc/calculate", (req, res) => {
    const parsed = discRankingsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid rankings format",
        details: parsed.error.errors,
        expectedFormat: {
          rankings: [
            { setNumber: 1, rankings: [4, 3, 2, 1] },
            { setNumber: 2, rankings: [1, 4, 3, 2] },
          ]
        }
      });
    }

    const { rankings } = parsed.data;

    let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

    for (const ranking of rankings) {
      dScore += ranking.rankings[0];
      iScore += ranking.rankings[1];
      sScore += ranking.rankings[2];
      cScore += ranking.rankings[3];
    }

    const totalScore = dScore + iScore + sScore + cScore;

    const scores = {
      dominance: dScore,
      influence: iScore,
      steadiness: sScore,
      conscientiousness: cScore,
    };

    const percentages = {
      dominance: Math.round((dScore / 96) * 100),
      influence: Math.round((iScore / 96) * 100),
      steadiness: Math.round((sScore / 96) * 100),
      conscientiousness: Math.round((cScore / 96) * 100),
    };

    const styleScores: [string, number][] = [
      ['D', dScore],
      ['I', iScore],
      ['S', sScore],
      ['C', cScore],
    ];
    styleScores.sort((a, b) => b[1] - a[1]);

    const result: DiscAssessmentResult = {
      scores,
      percentages,
      primaryStyle: styleScores[0][0] as 'D' | 'I' | 'S' | 'C',
      secondaryStyle: styleScores[1][0] as 'D' | 'I' | 'S' | 'C',
      styleDescriptions: DISC_STYLE_DESCRIPTIONS,
    };

    res.json(result);
  });

  // Simple endpoint for bots - accepts array format "Set X: [4,3,2,1]"
  app.post("/api/disc/calculate-simple", (req, res) => {
    try {
      const { responses } = req.body;
      
      if (!responses || !Array.isArray(responses) || responses.length !== 24) {
        return res.status(400).json({
          error: "Expected 24 response arrays",
          expectedFormat: {
            responses: [[4,3,2,1], [1,4,3,2], "...24 total"]
          }
        });
      }

      let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

      for (let i = 0; i < responses.length; i++) {
        const ranking = responses[i];
        if (!Array.isArray(ranking) || ranking.length !== 4) {
          return res.status(400).json({ error: `Set ${i + 1} must have exactly 4 rankings` });
        }
        if (new Set(ranking).size !== 4 || !ranking.every((n: number) => n >= 1 && n <= 4)) {
          return res.status(400).json({ error: `Set ${i + 1} must use each number 1-4 exactly once` });
        }
        dScore += ranking[0];
        iScore += ranking[1];
        sScore += ranking[2];
        cScore += ranking[3];
      }

      const percentages = {
        dominance: Math.round((dScore / 96) * 100),
        influence: Math.round((iScore / 96) * 100),
        steadiness: Math.round((sScore / 96) * 100),
        conscientiousness: Math.round((cScore / 96) * 100),
      };

      const styleScores: [string, number][] = [
        ['D', dScore],
        ['I', iScore],
        ['S', sScore],
        ['C', cScore],
      ];
      styleScores.sort((a, b) => b[1] - a[1]);

      res.json({
        scores: { dominance: dScore, influence: iScore, steadiness: sScore, conscientiousness: cScore },
        percentages,
        primaryStyle: styleScores[0][0],
        secondaryStyle: styleScores[1][0],
        styleDescriptions: DISC_STYLE_DESCRIPTIONS,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =====================================================
  // MVP Task Submission API
  // =====================================================
  
  // Zod schema for task submission validation
  const taskSubmitSchema = z.object({
    task: z.string().min(5, "Task must be at least 5 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    name: z.string().min(1, "Name is required"),
    agentName: z.string().min(1, "Agent name is required"),
    personality: z.object({
      id: z.enum(['achiever', 'collaborator', 'supporter', 'analyst']),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      disc: z.object({
        dominance: z.number().min(0).max(100),
        influence: z.number().min(0).max(100),
        steadiness: z.number().min(0).max(100),
        conscientiousness: z.number().min(0).max(100),
      }),
    }),
  });

  // Submit a new task (from MVP landing page)
  app.post("/api/tasks/submit", async (req, res) => {
    try {
      // Validate request body with Zod
      const validationResult = taskSubmitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { task, phone, name, personality, agentName } = validationResult.data;
      
      // Normalize phone number (remove formatting)
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      
      // Format to E.164 for Twilio
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      // Parse task using Kimi (with partial mode)
      let parsedTask = null;
      try {
        // parseTask removed — replaced by Gemini-based task parsing
        parsedTask = await parseTask(task);
        console.log('[Task Submit] Parsed task:', parsedTask);
      } catch (parseError) {
        console.error('[Task Submit] Task parsing error:', parseError);
      }
      
      // Calculate next update time (1 hour from now)
      const nextUpdateAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Create the task with validated DISC values
      const newTask = await storage.createTask({
        userName: name,
        userPhone: e164Phone,
        agentName,
        personalityId: personality.id,
        task,
        parsedTask,
        status: 'started',
        estimatedHours: parsedTask?.estimatedHours || 24,
        dominance: personality.disc.dominance,
        influence: personality.disc.influence,
        steadiness: personality.disc.steadiness,
        conscientiousness: personality.disc.conscientiousness,
        startedAt: new Date(),
        nextUpdateAt,
        updatesCount: 1,
      });
      
      console.log('[Task Submit] Created task:', newTask.id);
      
      // Send Navigator first-login "Call Coordinates" SMS
      let callCoordinates: string | null = null;
      try {
        // generateNavigatorIntroduction removed — replaced by Gemini
        
        // Fetch telephony config once; reuse the phone number as Call Coordinates
        const config = await storage.getTelephonyConfig();
        callCoordinates = config?.phoneNumber ?? null;

        const smsMessage = await generateNavigatorIntroduction({
          userName: name,
          agentName,
          taskDescription: task,
          callCoordinates: callCoordinates ?? 'Gateway Global AI',
        });
        
        // Send SMS via Twilio
        if (callCoordinates && config?.accountSid && config?.authToken) {
          const { sendSms } = await import("./twilio");
          await sendSms(e164Phone, smsMessage, callCoordinates);
          console.log(`[Task Submit] Sent Navigator intro SMS to ${e164Phone}`);
        } else {
          console.warn('[Task Submit] No Twilio config, skipping Navigator intro SMS');
        }
      } catch (smsError) {
        console.error('[Task Submit] Navigator intro SMS error:', smsError);
      }
      
      res.json({ 
        success: true, 
        taskId: newTask.id,
        message: `Task created! ${agentName} will text you shortly.`,
        callCoordinates,
      });
      
    } catch (error: any) {
      console.error('[Task Submit] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task status (for optional dashboard)
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get tasks by phone number
  app.get("/api/tasks/phone/:phone", async (req, res) => {
    try {
      const normalizedPhone = req.params.phone.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      const tasks = await storage.getTasksByPhone(e164Phone);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate mock conversation with Gemini TTS
  app.post("/api/conversation/generate", async (req, res) => {
    try {
      const { agentName, discProfile, scenario } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const discDescription = discProfile ? 
        `The agent has a DISC profile with: D=${discProfile.dominance}%, I=${discProfile.influence}%, S=${discProfile.steadiness}%, C=${discProfile.conscientiousness}%` :
        'The agent has a balanced DISC profile';

      const scenarioText = scenario || 'a friendly introduction and offering to help with questions';

      const conversationPrompt = `You are ${agentName || 'NEXUS'}, an AI assistant with the following personality traits based on the DISC model:
${discDescription}

Generate a brief, natural-sounding conversation response for this scenario: ${scenarioText}

Keep the response conversational, warm, and under 100 words. Speak directly as the agent.`;

      // Generate text response
      const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const textResult = await textModel.generateContent(conversationPrompt);
      const conversationText = textResult.response.text() || "Hello! I'm your AI assistant. How can I help you today?";

      // Generate TTS using direct API call (Gemini TTS model)
      const ttsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: conversationText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            }
          })
        }
      );

      let audioData = null;
      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (audioPart) {
          audioData = {
            data: audioPart.data,
            mimeType: audioPart.mimeType
          };
        }
      }

      res.json({
        text: conversationText,
        audio: audioData,
        agentName: agentName || 'NEXUS',
        discProfile: discProfile || { dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50 }
      });
    } catch (error: any) {
      console.error('Gemini TTS error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available TTS voices
  app.get("/api/conversation/voices", async (req, res) => {
    res.json({
      voices: [
        { id: 'Kore', name: 'Kore', description: 'Warm and professional' },
        { id: 'Puck', name: 'Puck', description: 'Friendly and upbeat' },
        { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', description: 'Calm and reassuring' },
        { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', description: 'Soft and gentle' }
      ]
    });
  });

  // ============================================
  // AGENT MANAGEMENT API
  // ============================================

  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agentList = await storage.getAgents();
      res.json(agentList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create agent
  app.post("/api/agents", async (req, res) => {
    try {
      const parsed = insertAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const agent = await storage.createAgent(parsed.data);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update agent
  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete agent
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AGENT BUDGET & STARTUP SCRIPT API
  // ============================================

  // Cost estimation: approximate USD per 1K tokens by model
  const MODEL_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
    
    'default': { input: 0.002, output: 0.006 },
  };

  function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
    const rates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  }

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  function getNextResetDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  // Serve only the client-designated Maps key (referrer-restricted). Never expose server keys (GOOGLE_MAPS_API_KEY, GOOGLE_CLOUD_API_KEY).
  app.get("/api/config/maps-key", (_req, res) => {
    const key = process.env.GOOGLE_MAPS_JS_API || process.env.GOOGLE_MAPS_JS_KEY;
    if (!key) {
      return res.status(503).json({
        error: "Google Maps API key not configured for client. Set GOOGLE_MAPS_JS_API or GOOGLE_MAPS_JS_KEY (referrer-restricted key); do not use server key here.",
      });
    }
    res.json({ key });
  });

  // Update agent budget configuration
  app.patch("/api/agents/:id/budget", async (req, res) => {
    try {
      const schema = z.object({
        budgetAmountUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Budget must be a non-negative number" }).optional(),
        budgetPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
        startupScript: z.string().max(10000).optional().nullable(),
        startupBudgetUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Startup budget must be a non-negative number" }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const updates: any = {};
      if (parsed.data.budgetAmountUsd !== undefined) updates.budgetAmountUsd = parsed.data.budgetAmountUsd;
      if (parsed.data.budgetPeriod !== undefined) {
        updates.budgetPeriod = parsed.data.budgetPeriod;
        updates.budgetResetAt = getNextResetDate(parsed.data.budgetPeriod);
      }
      if (parsed.data.startupScript !== undefined) updates.startupScript = parsed.data.startupScript;
      if (parsed.data.startupBudgetUsd !== undefined) updates.startupBudgetUsd = parsed.data.startupBudgetUsd;

      const agent = await storage.updateAgent(req.params.id, updates);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get agent budget summary
  app.get("/api/agents/:id/budget", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Check if budget period has reset
      const now = new Date();
      let spentUsd = parseFloat(agent.budgetSpentUsd || '0');
      let resetAt = agent.budgetResetAt;

      if (resetAt && now > new Date(resetAt)) {
        spentUsd = 0;
        resetAt = getNextResetDate(agent.budgetPeriod || 'monthly');
        await storage.updateAgent(agent.id, {
          budgetSpentUsd: '0',
          budgetResetAt: resetAt,
        });
      }

      const budgetAmount = parseFloat(agent.budgetAmountUsd || '0');
      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');

      res.json({
        budgetAmountUsd: budgetAmount,
        budgetPeriod: agent.budgetPeriod || 'monthly',
        budgetSpentUsd: spentUsd,
        budgetRemainingUsd: Math.max(0, budgetAmount - spentUsd),
        budgetResetAt: resetAt,
        startupScript: agent.startupScript,
        startupBudgetUsd: startupBudget,
        startupStatus: agent.startupStatus || 'pending',
        startupResultSummary: agent.startupResultSummary,
        startupLastRunAt: agent.startupLastRunAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run agent startup script
  app.post("/api/agents/:id/startup-run", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      if (!agent.startupScript || agent.startupScript.trim().length === 0) {
        return res.status(400).json({ error: "No startup script configured for this agent" });
      }

      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');
      if (startupBudget <= 0) {
        return res.status(400).json({ error: "Startup budget must be greater than $0" });
      }

      // Mark as running
      await storage.updateAgent(agent.id, { startupStatus: 'running' });

      const modelId = agent.aiModelId || process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';
      const temperature = (agent.aiTemperature || 60) / 100;
      const maxTokens = agent.aiMaxTokens || 4096;

      // Build research prompt
      const systemPrompt = agent.systemPrompt
        ? `${agent.systemPrompt}\n\n--- STARTUP RESEARCH TASK ---\nYou have been allocated a startup budget of $${startupBudget.toFixed(2)} for initial research. Complete the research task below thoroughly. Provide actionable findings, data points, and recommendations. Be concise but comprehensive.`
        : `You are ${agent.name}, an AI agent performing initial research. You have a budget of $${startupBudget.toFixed(2)}. Complete the research task thoroughly with actionable findings.`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `STARTUP RESEARCH TASK:\n\n${agent.startupScript}\n\nProvide a thorough research report with findings, data, and actionable recommendations.` },
      ];

      // Estimate input tokens for cost tracking
      const inputText = messages.map(m => m.content).join(' ');
      const estimatedInputTokens = estimateTokens(inputText);

      // Cap output tokens based on budget
      const modelRates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
      const inputCost = (estimatedInputTokens / 1000) * modelRates.input;
      const remainingBudget = startupBudget - inputCost;
      const maxOutputByBudget = Math.floor((remainingBudget / modelRates.output) * 1000);
      const cappedMaxTokens = Math.min(maxTokens, Math.max(500, maxOutputByBudget));

      try {
        const response = await chat({
          model: modelId as any,
          messages,
          temperature,
          max_tokens: cappedMaxTokens,
        });

        // Estimate cost
        const estimatedOutputTokens = estimateTokens(response);
        const totalCost = estimateCostUsd(modelId, estimatedInputTokens, estimatedOutputTokens);

        // Update agent with results
        const currentSpent = parseFloat(agent.budgetSpentUsd || '0');
        await storage.updateAgent(agent.id, {
          startupStatus: 'completed',
          startupResultSummary: response.slice(0, 10000),
          startupLastRunAt: new Date(),
          budgetSpentUsd: (currentSpent + totalCost).toFixed(2),
        });

        res.json({
          success: true,
          result: response,
          estimatedCostUsd: totalCost,
          tokensUsed: {
            input: estimatedInputTokens,
            output: estimatedOutputTokens,
          },
        });
      } catch (aiError: any) {
        await storage.updateAgent(agent.id, { startupStatus: 'failed' });
        res.status(500).json({ error: `AI request failed: ${aiError.message}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reset agent budget spending
  app.post("/api/agents/:id/budget-reset", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      
      await storage.updateAgent(agent.id, {
        budgetSpentUsd: '0',
        budgetResetAt: getNextResetDate(agent.budgetPeriod || 'monthly'),
      });
      
      res.json({ success: true, message: 'Budget reset successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ORGANIZATIONS, PROJECTS & TASKS API
  // ============================================

  // Organizations CRUD
  app.get("/api/organizations", async (req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.createOrganization(parsed.data);
      res.status(201).json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.updateOrganization(req.params.id, parsed.data);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      await storage.deleteOrganization(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects CRUD
  app.get("/api/projects", async (req, res) => {
    try {
      const orgId = req.query.orgId as string | undefined;
      const projectsList = await storage.getProjects(orgId);
      res.json(projectsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const schema = z.object({
        orgId: z.string().min(1),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.updateProject(req.params.id, parsed.data);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project Tasks CRUD
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const tasksList = await storage.getProjectTasks(req.params.projectId);
      res.json(tasksList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const taskData = {
        ...parsed.data,
        projectId: req.params.projectId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      };
      const task = await storage.createProjectTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/project-tasks/:id", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const updates: any = { ...parsed.data };
      if (parsed.data.dueDate) updates.dueDate = new Date(parsed.data.dueDate);
      if (parsed.data.status === 'done') updates.completedAt = new Date();
      const task = await storage.updateProjectTask(req.params.id, updates);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/project-tasks/:id", async (req, res) => {
    try {
      await storage.deleteProjectTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project context endpoint - assembles full context for chat
  app.get("/api/projects/:id/context", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const org = await storage.getOrganization(project.orgId);
      const tasksList = await storage.getProjectTasks(project.id);
      const allAgents = await storage.getAgents();
      const assignedAgents = allAgents.filter(a => 
        project.agentIds?.includes(a.id) || a.id === project.leadAgentId
      );
      res.json({
        organization: org,
        project,
        tasks: tasksList,
        agents: assignedAgents.map(a => ({ id: a.id, name: a.name })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // BOT TEMPLATES API
  // ============================================

  app.get("/api/bot-templates", async (_req, res) => {
    try {
      const templates = await storage.getBotTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.getBotTemplate(req.params.id);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bot-templates", async (req, res) => {
    try {
      const { insertBotTemplateSchema } = await import("@shared/schema");
      const parsed = insertBotTemplateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const template = await storage.createBotTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateBotTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/bot-templates/:id", async (req, res) => {
    try {
      await storage.deleteBotTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AI GATEWAY INFO API
  // ============================================

  app.get("/api/gateway/providers", async (_req, res) => {
    try {
      const { getAvailableProviders } = await import('./ai-gateway');
      res.json(getAvailableProviders());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PUBLIC BOT CONFIG & EMBED SCRIPT
  // ============================================

  app.get("/api/bots/:siteConfigId/public", async (req, res) => {
    try {
      const siteConfigId = req.params.siteConfigId;
      // Platform landing chat (BusinessPage, etc.) does not require a DB site config
      if (siteConfigId === 'platform-landing' || siteConfigId === 'platform') {
        return res.json({
          id: siteConfigId,
          name: 'Gateway AI',
          ui_config: {
            position: 'bottom-right',
            primaryColor: '#6366f1',
            greetingMessage: "Hi! I can help you learn about our free AI-powered websites, plans, and features. What would you like to know?",
            placeholderText: 'Ask about our services...',
          },
        });
      }
      const config = await storage.getSiteConfig(siteConfigId);
      if (!config || !config.chatbotEnabled) {
        return res.status(404).json({ error: "Bot not found or disabled" });
      }
      res.json({
        id: config.id,
        name: config.name,
        ui_config: {
          position: config.widgetPosition || 'bottom-right',
          primaryColor: config.widgetColor || '#2563eb',
          greetingMessage: config.greetingMessage || `Hi! How can I help you today?`,
          placeholderText: config.placeholderText || 'Type a message...',
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/embed.js", (_req, res) => {
    const baseUrl = `${_req.protocol}://${_req.get('host')}`;
    const script = `(function(){
  'use strict';
  var API=window.GATEWAY_API_URL||'${baseUrl}';
  var s=document.currentScript;
  var botId=s&&s.dataset.botId;
  if(!botId){console.error('[Gateway Bot] No bot-id');return;}
  var config=null,isOpen=false,msgs=[],loading=false;
  function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
  function createHost(){
    var h=document.createElement('div');h.id='gateway-bot-'+botId;document.body.appendChild(h);
    var sh=h.attachShadow({mode:'open'});
    var st=document.createElement('style');
    st.textContent=':host{all:initial;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box;margin:0;padding:0}.gw{position:fixed;z-index:2147483647}.gw.br{bottom:16px;right:16px}.gw.bl{bottom:16px;left:16px}.gw.tr{top:16px;right:16px}.gw.tl{top:16px;left:16px}.gw-btn{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.15);transition:transform .2s}.gw-btn:hover{transform:scale(1.05)}.gw-chat{position:absolute;bottom:72px;right:0;width:360px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;animation:gw-in .2s ease-out}@keyframes gw-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.gw-hdr{padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb}.gw-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px}.gw-nm{font-weight:600;font-size:14px;color:#111827}.gw-st{font-size:12px;color:#10b981;display:flex;align-items:center;gap:4px}.gw-st::before{content:"";width:6px;height:6px;background:#10b981;border-radius:50%}.gw-cl{width:32px;height:32px;border:none;background:transparent;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280}.gw-cl:hover{background:#f3f4f6}.gw-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:400px}.gw-msg{display:flex;gap:8px;max-width:85%}.gw-msg.u{align-self:flex-end}.gw-bbl{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}.gw-msg.a .gw-bbl{background:#f3f4f6;color:#111827;border-bottom-left-radius:4px}.gw-msg.u .gw-bbl{color:#fff;border-bottom-right-radius:4px}.gw-typ{display:flex;gap:4px;padding:12px 14px;background:#f3f4f6;border-radius:16px;border-bottom-left-radius:4px;width:fit-content}.gw-dot{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:gw-b 1.4s infinite ease-in-out both}.gw-dot:nth-child(1){animation-delay:-.32s}.gw-dot:nth-child(2){animation-delay:-.16s}@keyframes gw-b{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}.gw-inp{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px}.gw-inp input{flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:24px;font-size:14px;outline:none}.gw-inp button{width:40px;height:40px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}.gw-inp button:disabled{opacity:.5;cursor:not-allowed}.gw-empty{text-align:center;padding:32px 16px;color:#9ca3af}@media(max-width:480px){.gw-chat{position:fixed;bottom:80px!important;right:16px!important;left:16px!important;width:auto!important}}';
    sh.appendChild(st);return{host:h,shadow:sh};
  }
  async function fetchCfg(){
    try{var r=await fetch(API+'/api/bots/'+botId+'/public');if(!r.ok)throw 0;config=await r.json();}
    catch(e){config={name:'Bot',ui_config:{position:'bottom-right',primaryColor:'#2563eb',greetingMessage:'Hello! How can I help?',placeholderText:'Type a message...'}};}
  }
  async function send(txt,shadow){
    if(!txt.trim()||loading)return;
    msgs.push({role:'user',content:txt});loading=true;render(shadow);
    try{
      var r=await fetch(API+'/api/website-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:txt,siteConfigId:botId,visitorId:'embed-'+Date.now(),history:msgs.filter(function(m){return m.role!=='system';}).slice(-10)})});
      var d=await r.json();msgs.push({role:'assistant',content:d.response||'Sorry, I could not respond.'});
    }catch(e){msgs.push({role:'assistant',content:'Sorry, something went wrong.'});}
    loading=false;render(shadow);
  }
  function render(shadow){
    var w=shadow.querySelector('.gw')||document.createElement('div');
    var pos=config&&config.ui_config&&config.ui_config.position||'bottom-right';
    var posClass=pos==='bottom-left'?'bl':pos==='top-right'?'tr':pos==='top-left'?'tl':'br';
    w.className='gw '+posClass;w.innerHTML='';
    var pc=config&&config.ui_config&&config.ui_config.primaryColor||'#2563eb';
    if(!isOpen){
      w.innerHTML='<button class="gw-btn" style="background:'+pc+'"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';
      w.querySelector('.gw-btn').onclick=function(){isOpen=true;render(shadow);};
    }else{
      var gm=config&&config.ui_config&&config.ui_config.greetingMessage||'Hello!';
      var ph=config&&config.ui_config&&config.ui_config.placeholderText||'Type a message...';
      var nm=config&&config.name||'Bot';
      var html='<div class="gw-chat"><div class="gw-hdr"><div class="gw-av" style="background:'+pc+'">'+nm[0].toUpperCase()+'</div><div style="flex:1"><div class="gw-nm">'+esc(nm)+'</div><div class="gw-st">Online</div></div><button class="gw-cl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div><div class="gw-msgs">';
      if(msgs.length===0){html+='<div class="gw-empty"><p>'+esc(gm)+'</p></div>';}
      else{msgs.forEach(function(m){html+='<div class="gw-msg '+(m.role==='user'?'u':'a')+'"><div class="gw-bbl" style="'+(m.role==='user'?'background:'+pc:'')+'">'+ esc(m.content)+'</div></div>';});}
      if(loading){html+='<div class="gw-msg a"><div class="gw-typ"><span class="gw-dot"></span><span class="gw-dot"></span><span class="gw-dot"></span></div></div>';}
      html+='</div><div class="gw-inp"><input type="text" placeholder="'+esc(ph)+'"/><button style="background:'+pc+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div></div>';
      w.innerHTML=html;
      w.querySelector('.gw-cl').onclick=function(){isOpen=false;render(shadow);};
      var inp=w.querySelector('.gw-inp input');var btn=w.querySelector('.gw-inp button');
      btn.onclick=function(){var v=inp.value.trim();if(v){inp.value='';send(v,shadow);}};
      inp.onkeydown=function(e){if(e.key==='Enter')btn.click();};
      var msgArea=w.querySelector('.gw-msgs');if(msgArea)msgArea.scrollTop=msgArea.scrollHeight;
    }
    if(!shadow.contains(w))shadow.appendChild(w);
  }
  async function init(){await fetchCfg();var c=createHost();render(c.shadow);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();`;
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(script);
  });

  // ============================================
  // SITE CONFIG (AI BIZ BOT ADMIN) API
  // ============================================

  app.get("/api/site-configs", async (_req, res) => {
    try {
      const configs = await storage.getSiteConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/site-configs", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200),
        domain: z.string().optional(),
        placeId: z.string().optional(),
        placeData: z.any().optional(),
        assignedAgentId: z.string().nullable().optional(),
        systemPromptOverride: z.string().optional(),
        chatbotEnabled: z.boolean().optional(),
        voiceConciergeEnabled: z.boolean().optional(),
        widgetPosition: z.string().optional(),
        widgetColor: z.string().optional(),
        greetingMessage: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const config = await storage.createSiteConfig(parsed.data);
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/site-configs/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        domain: z.string().nullable().optional(),
        placeId: z.string().nullable().optional(),
        placeData: z.any().optional(),
        assignedAgentId: z.string().nullable().optional(),
        systemPromptOverride: z.string().nullable().optional(),
        chatbotEnabled: z.boolean().optional(),
        voiceConciergeEnabled: z.boolean().optional(),
        widgetPosition: z.string().optional(),
        widgetColor: z.string().optional(),
        greetingMessage: z.string().nullable().optional(),
        knowledgeLibrary: z.array(z.object({ id: z.string(), title: z.string(), content: z.string(), addedAt: z.string() })).nullable().optional(),
        heroImageUrl: z.string().nullable().optional(),
        heroImagePrompt: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const updated = await storage.updateSiteConfig(req.params.id, parsed.data as any);
      if (!updated) return res.status(404).json({ error: "Site config not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/site-configs/:id", async (req, res) => {
    try {
      await storage.deleteSiteConfig(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sub-Account CID Provisioning Engine
  // Automatically creates a Twilio sub-account for a new AI Partner, purchases a
  // local phone number in that sub-account, and wires the Voice URL webhook so the
  // number is live in a single API call (< 10 s target).
  app.post("/api/site-configs/:id/provision-number", async (req, res) => {
    try {
      const siteConfig = await storage.getSiteConfig(req.params.id);
      if (!siteConfig) return res.status(404).json({ error: "AI Partner not found" });

      if (siteConfig.provisionedPhoneNumber) {
        return res.status(409).json({
          error: "A phone number is already provisioned for this AI Partner",
          phoneNumber: siteConfig.provisionedPhoneNumber,
        });
      }

      const schema = z.object({
        areaCode: z.string().regex(/^\d{3}$/, "Area code must be exactly 3 digits"),
        country: z.string().length(2).optional().default("US"),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const { areaCode, country } = parsed.data;

      // Build the Voice webhook URL pointing to the AI voice concierge endpoint.
      // /webhook/voice/kimi is the primary voice AI handler registered in routes.ts.
      const host = process.env.REPLIT_DEV_DOMAIN || req.get("host");
      const voiceWebhookUrl = `https://${host}/webhook/voice/stream`;

      const result = await createSubAccountAndProvisionNumber(
        siteConfig.name,
        areaCode,
        voiceWebhookUrl,
        country,
      );

      // Persist the sub-account and provisioned number on the site config
      // Note: authToken is saved in the twilioSubAccounts table for security
      const savedSubAccount = await storage.createTwilioSubAccount({
        accountSid: result.subAccountSid,
        authToken: result.subAccountAuthToken,
        friendlyName: result.subAccountFriendlyName,
        status: "active",
        ownerEmail: null,
      });

      await storage.updateSiteConfig(req.params.id, {
        twilioSubAccountSid: result.subAccountSid,
        provisionedPhoneNumber: result.phoneNumber,
        provisionedPhoneSid: result.phoneSid,
      });

      console.log(`[Provision] AI Partner "${siteConfig.name}" (${req.params.id}) provisioned number ${result.phoneNumber} via sub-account ${result.subAccountSid}`);

      res.status(201).json({
        subAccountSid: result.subAccountSid,
        subAccountId: savedSubAccount.id,
        phoneNumber: result.phoneNumber,
        phoneSid: result.phoneSid,
        voiceWebhookUrl,
      });
    } catch (error: any) {
      console.error("[Provision] Error provisioning number:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Hero Image Generation — uses Flux via Replicate (same pattern as classroom)
  app.post("/api/site-configs/:id/generate-hero-image", async (req, res) => {
    try {
      const siteConfig = await storage.getSiteConfig(req.params.id);
      if (!siteConfig) return res.status(404).json({ error: "Site not found" });

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) return res.status(503).json({ error: "Image generation not configured. Please add REPLICATE_API_TOKEN to Doppler." });

      // Build a rich, business-specific prompt
      const { customPrompt } = req.body || {};
      const businessName = siteConfig.name || "a local business";
      const placeData = siteConfig.placeData as any;
      const types = (placeData?.types || []).filter((t: string) => !['point_of_interest','establishment'].includes(t)).slice(0, 3).join(', ');
      const address = placeData?.formatted_address?.split(',').slice(-2).join(',').trim() || '';

      const prompt = customPrompt || [
        `Professional hero image for ${businessName}`,
        types ? `a ${types} business` : null,
        address ? `located in ${address}` : null,
        `— cinematic wide angle shot, golden hour lighting, photorealistic, ultra high resolution,`,
        `modern architectural photography style, inviting atmosphere, no text overlays`,
      ].filter(Boolean).join(', ');

      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: replicateToken });

      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: {
          prompt,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 92,
        },
      });

      const imageUrl = (Array.isArray(output) ? output[0] : output) as string;
      if (!imageUrl) throw new Error("No image URL returned from generator");

      // Persist the URL back to site_configs
      await storage.updateSiteConfig(req.params.id, { heroImageUrl: imageUrl, heroImagePrompt: prompt } as any);

      res.json({ imageUrl, prompt });
    } catch (err: any) {
      console.error("[HeroImage] Generation error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/site-configs/:id/chat-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getChatLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/site-configs/:id/knowledge", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const lib = (site as any).knowledgeLibrary;
      res.json(Array.isArray(lib) ? lib : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/site-configs/:id/knowledge", async (req, res) => {
    try {
      const schema = z.object({ title: z.string().min(1).max(200), content: z.string().max(500000) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
      const doc = {
        id: crypto.randomUUID(),
        title: parsed.data.title,
        content: parsed.data.content,
        addedAt: new Date().toISOString(),
      };
      const updated = await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: [...existing, doc] } as any);
      res.json(updated?.knowledgeLibrary ?? [...existing, doc]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/site-configs/:id/knowledge/:docId", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
      const next = existing.filter((d: any) => d.id !== req.params.docId);
      await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: next } as any);
      res.json({ success: true, knowledgeLibrary: next });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Energy / Usage Ledger endpoints ─────────────────────────────────────────

  /** GET /api/site-configs/:id/energy – current balance + lifetime totals */
  app.get("/api/site-configs/:id/energy", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const balance = await getEnergyBalance(req.params.id);
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** GET /api/site-configs/:id/energy/logs – paginated usage log */
  app.get("/api/site-configs/:id/energy/logs", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
      const logs = await getVoiceUsageLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** POST /api/site-configs/:id/energy/top-up – add prepaid minutes */
  app.post("/api/site-configs/:id/energy/top-up", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const schema = z.object({ minutes: z.number().int().positive() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "minutes must be a positive integer" });

      const current = site.minuteBalance ?? 0;
      const newBalance = current + parsed.data.minutes;
      await storage.updateSiteConfig(req.params.id, { minuteBalance: newBalance } as any);
      res.json({ success: true, minuteBalance: newBalance, added: parsed.data.minutes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List demo leads for chat admin (new customers + demo URLs)
  app.get("/api/admin/demo-leads", async (req, res) => {
    try {
      const leads = await storage.getAllDemoLeads();
      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const baseUrl = `${protocol}://${host}`;
      const withUrls = await Promise.all(
        leads.map(async (lead) => {
          const demoUrl = `${baseUrl}/demo?token=${lead.magicToken}`;
          let siteId: string | null = null;
          if (lead.placeId) {
            const site = await storage.getSiteConfigByPlaceId(lead.placeId);
            siteId = site?.id ?? null;
          }
          return {
            id: lead.id,
            phone: lead.phone,
            name: lead.name,
            businessName: lead.businessName,
            businessAddress: lead.businessAddress,
            placeId: lead.placeId,
            status: lead.status,
            magicTokenUsed: lead.magicTokenUsed,
            demoStartedAt: lead.demoStartedAt,
            demoReadyAt: lead.demoReadyAt,
            createdAt: lead.createdAt,
            demoUrl,
            siteId,
          };
        })
      );
      res.json(withUrls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // OG META TAG MANAGEMENT API
  // ============================================

  app.get("/api/admin/og-settings", async (_req, res) => {
    try {
      const settings = await storage.getAllOgSettings();
      res.json({ settings, defaults: DEFAULT_OG });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/og-settings", async (req, res) => {
    try {
      const { pagePath, ogTitle, ogDescription, ogUrl, ogImage, ogType, ogSiteName, twitterCard } = req.body;
      if (!pagePath || !ogTitle || !ogDescription) {
        return res.status(400).json({ error: "Page path, title, and description are required" });
      }
      const result = await storage.upsertOgSettings({
        pagePath: pagePath.startsWith("/") ? pagePath : `/${pagePath}`,
        ogTitle,
        ogDescription,
        ogUrl: ogUrl || null,
        ogImage: ogImage || null,
        ogType: ogType || "website",
        ogSiteName: ogSiteName || null,
        twitterCard: twitterCard || "summary_large_image",
      });
      res.json({ success: true, settings: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/og-settings/:id", async (req, res) => {
    try {
      await storage.deleteOgSettings(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SITES & LEADS ADMIN API
  // ============================================

  app.get("/api/admin/sites/summary", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      const summaries = await Promise.all(sites.map(async (site) => {
        const logs = await storage.getChatLogs(site.id, 10000);
        const uniqueVisitors = new Set(logs.filter(l => l.visitorId).map(l => l.visitorId));
        const lastActivity = logs.length > 0 ? logs[0].createdAt : null;
        const placeData = site.placeData as any;
        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          placeId: site.placeId,
          chatbotEnabled: site.chatbotEnabled,
          voiceConciergeEnabled: site.voiceConciergeEnabled,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
          totalVisitors: uniqueVisitors.size,
          totalMessages: logs.length,
          lastActivity,
          businessPhone: placeData?.phone || null,
          businessAddress: placeData?.address || null,
          industry: placeData?.industry || null,
          rating: placeData?.rating || null,
          reviewCount: placeData?.reviewCount || null,
        };
      }));
      summaries.sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0));
      res.json(summaries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/:id/visitors", async (req, res) => {
    try {
      const logs = await storage.getChatLogs(req.params.id, 10000);
      const visitorMap = new Map<string, { visitorId: string; messageCount: number; firstSeen: Date | null; lastSeen: Date | null }>();
      for (const log of logs) {
        const vid = log.visitorId || "anonymous";
        if (!visitorMap.has(vid)) {
          visitorMap.set(vid, { visitorId: vid, messageCount: 0, firstSeen: log.createdAt, lastSeen: log.createdAt });
        }
        const v = visitorMap.get(vid)!;
        v.messageCount++;
        if (log.createdAt && (!v.firstSeen || log.createdAt < v.firstSeen)) v.firstSeen = log.createdAt;
        if (log.createdAt && (!v.lastSeen || log.createdAt > v.lastSeen)) v.lastSeen = log.createdAt;
      }
      const visitors = Array.from(visitorMap.values()).sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));
      res.json(visitors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/:id/chat-history", async (req, res) => {
    try {
      const visitorId = req.query.visitorId as string | undefined;
      const logs = await storage.getChatLogs(req.params.id, 10000);
      const filtered = visitorId ? logs.filter(l => l.visitorId === visitorId) : logs;
      filtered.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/analytics", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      let totalVisitors = 0;
      let totalMessages = 0;
      let activeSites = 0;
      for (const site of sites) {
        const logs = await storage.getChatLogs(site.id, 10000);
        const uniqueVisitors = new Set(logs.filter(l => l.visitorId).map(l => l.visitorId));
        totalVisitors += uniqueVisitors.size;
        totalMessages += logs.length;
        if (logs.length > 0) activeSites++;
      }
      res.json({ totalSites: sites.length, activeSites, totalVisitors, totalMessages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/leads", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      const prospects = await storage.getVlmProspects({ limit: 10000 });
      const leads = sites.map(site => {
        const placeData = site.placeData as any;
        const matchedProspect = prospects.find(p => p.googlePlaceId && p.googlePlaceId === site.placeId);
        return {
          siteId: site.id,
          siteName: site.name,
          placeId: site.placeId,
          domain: site.domain,
          chatbotEnabled: site.chatbotEnabled,
          voiceConciergeEnabled: site.voiceConciergeEnabled,
          createdAt: site.createdAt,
          businessPhone: placeData?.phone || matchedProspect?.phone || null,
          businessAddress: placeData?.address || null,
          industry: placeData?.industry || matchedProspect?.industry || null,
          rating: placeData?.rating || null,
          reviewCount: placeData?.reviewCount || null,
          prospectId: matchedProspect?.id || null,
          qualityScore: matchedProspect?.qualityScore || null,
          prospectStatus: matchedProspect?.status || null,
          smsSent: matchedProspect?.notes?.includes("SMS sent") || false,
          siteGenerated: matchedProspect?.notes?.includes("Site generated") || false,
        };
      });
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ADMIN COMMAND CHAT API
  // ============================================
  app.post("/api/admin/command-chat", async (req, res) => {
    try {
      const chatSchema = z.object({
        agentId: z.string().min(1),
        message: z.string().min(1).max(4000),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Gather live business context
      let businessContext = '';
      try {
        const sites = await storage.getSiteConfigs();
        const customers = await storage.getCustomers();
        const allChatLogs: any[] = [];
        for (const site of sites.slice(0, 50)) {
          const logs = await storage.getChatLogs(site.id, 200);
          allChatLogs.push(...logs);
        }
        const chatLogs = allChatLogs;
        const prospects = await storage.getVlmProspects({ limit: 10000 });
        const campaigns = await storage.getVlmCampaigns();

        const activeSites = sites.filter(s => s.chatbotEnabled || s.voiceConciergeEnabled);
        const totalVisitors = new Set(chatLogs.map((l: any) => l.visitorId).filter(Boolean)).size;
        const totalMessages = chatLogs.length;
        const wonProspects = prospects.filter(p => p.status === 'won');
        const calledProspects = prospects.filter(p => p.status === 'called');
        const newCustomers = customers.filter((c: any) => c.status === 'new');
        const activeCustomers = customers.filter((c: any) => c.status === 'active');

        businessContext = `\n\n--- ADMIN BUSINESS CONTEXT (LIVE DATA) ---
SITES: ${sites.length} total, ${activeSites.length} active (with chatbot/voice enabled)
VISITORS: ${totalVisitors} unique visitors across all sites
MESSAGES: ${totalMessages} total chat messages
CUSTOMERS: ${customers.length} total (${newCustomers.length} new, ${activeCustomers.length} active)
LEADS/PROSPECTS: ${prospects.length} total, ${calledProspects.length} called, ${wonProspects.length} converted
CAMPAIGNS: ${campaigns.length || 0} VLM campaigns

Top Sites by Activity:`;

        const sitesWithCounts = sites.map(s => {
          const siteLogs = chatLogs.filter((l: any) => l.siteConfigId === s.id);
          const visitors = new Set(siteLogs.map((l: any) => l.visitorId).filter(Boolean)).size;
          return { name: s.name, visitors, messages: siteLogs.length, chatbot: s.chatbotEnabled, voice: s.voiceConciergeEnabled };
        }).sort((a, b) => b.messages - a.messages).slice(0, 10);

        sitesWithCounts.forEach(s => {
          businessContext += `\n- ${s.name}: ${s.visitors} visitors, ${s.messages} messages${s.chatbot ? ' [Chat]' : ''}${s.voice ? ' [Voice]' : ''}`;
        });

        if (customers.length > 0) {
          businessContext += `\n\nRecent Customers:`;
          customers.slice(0, 5).forEach((c: any) => {
            businessContext += `\n- ${c.name} (${c.status})${c.phone ? ' Ph:' + c.phone : ''}${c.email ? ' ' + c.email : ''}`;
          });
        }

        if (prospects.length > 0) {
          businessContext += `\n\nRecent Prospects:`;
          prospects.slice(0, 5).forEach((p: any) => {
            businessContext += `\n- ${p.businessName} (${p.status}, score:${p.qualityScore || 'N/A'})${p.phone ? ' Ph:' + p.phone : ''}`;
          });
        }

        businessContext += `\n--- END BUSINESS CONTEXT ---`;
      } catch (contextError) {
        console.warn('Failed to gather business context:', contextError);
        businessContext = '\n\n[Business context unavailable - some data could not be loaded]';
      }

      // Build admin-enhanced system prompt
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      const systemPrompt = (agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with DISC profile: ${discProfile}. Voice style: ${agent.voiceName}.`) + `

You are in ADMIN COMMAND MODE. The admin is using you to manage and monitor business operations. You have access to live business data below.

Your capabilities in this mode:
- Report on site analytics, visitor activity, and chat history
- Analyze lead quality scores and conversion rates
- Summarize customer status and pipeline health
- Advise on VoiceLeadMachine campaign strategy
- Help configure agent settings and telephony
- Provide actionable business intelligence and recommendations

Be direct, data-driven, and actionable. Reference specific numbers from the live data. If the admin asks about something not in the data, say what data you do have and suggest how to get more.
${businessContext}`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;
      // Sovereign: Gemini is the sole AI provider. Model from Doppler.
      const modelToUse = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';

      let response: string;
      try {
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      } catch (firstError: any) {
        console.warn('Admin command chat first attempt failed, retrying:', firstError.message);
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Admin command chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // ============================================
  // PUBLIC AGENT CHAT API
  // ============================================

  // ============ Website Preview Chat (AI Biz Bot) ============
  app.post("/api/website-chat", async (req, res) => {
    try {
      const schema = z.object({
        message: z.string().min(1).max(4000),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessPhone: z.string().optional(),
        siteConfigId: z.string().optional(),
        visitorId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { message, businessName, businessAddress, businessPhone, siteConfigId, visitorId, history } = parsed.data;

      let siteConfig: any = null;
      let resolvedProvider: any = 'gemini';
      let resolvedModel: string | undefined;
      let customSystemPrompt: string | undefined;

      const isPlatformChat = siteConfigId === 'platform-landing';

      if (siteConfigId && !isPlatformChat) {
        siteConfig = await storage.getSiteConfig(siteConfigId);
        if (siteConfig) {
          resolvedProvider = siteConfig.modelProvider || 'gemini';
          resolvedModel = siteConfig.modelName || undefined;
          customSystemPrompt = siteConfig.systemPromptOverride || undefined;
        }
      }

      const knowledgeLibrary = Array.isArray((siteConfig as any)?.knowledgeLibrary) ? (siteConfig as any).knowledgeLibrary as Array<{ id: string; title: string; content: string }> : [];
      const KNOWLEDGE_CAP = 32000;
      let knowledgeBlock = "";
      if (knowledgeLibrary.length > 0) {
        const combined = knowledgeLibrary.map((d) => `## ${d.title}\n${d.content}`).join("\n\n---\n\n");
        knowledgeBlock = "\n\n--- KNOWLEDGE LIBRARY (use this to answer questions accurately) ---\n\n" + combined.slice(0, KNOWLEDGE_CAP) + (combined.length > KNOWLEDGE_CAP ? "\n\n[truncated]" : "");
      }

      let systemPrompt: string;
      if (isPlatformChat) {
        systemPrompt = `You are Gateway AI, the helpful assistant for AI Biz Bot by Gateway Global AI. You help visitors understand the platform and its services.

Key information about the platform:
- We create FREE professional AI-powered websites for small businesses
- Websites are generated from Google Maps/Places data automatically
- Every website comes with an AI chat concierge and voice AI assistant
- No credit card required for the free plan
- Plans: Free (1 business, static site, shared SMS, 500 voice minutes), Business ($49/mo, 5 businesses, edit content, review management, SMS admin), Business Voice ($99/mo, dedicated phone, unlimited voice, custom voice persona), Enterprise (custom pricing, API access, white-label)
- Websites are built using real Google Maps data: reviews, photos, hours, location
- Business owners can manage their sites from the My Account dashboard
- The platform uses Google Gemini AI for intelligent responses

Be friendly, concise, and helpful. Encourage visitors to try it out by searching for their business. Keep responses brief since this is a chat widget. If asked about technical details you don't know, suggest they contact us.`;
      } else {
        const basePrompt = customSystemPrompt || `You are the AI Biz Bot, a friendly AI assistant for ${businessName || 'this business'}. You help website visitors with questions about the business.

Business details:
- Name: ${businessName || 'N/A'}
- Address: ${businessAddress || 'N/A'}  
- Phone: ${businessPhone || 'N/A'}

You are helpful, concise, and conversational. Answer questions about the business, help with directions, hours, and services. If you don't know something specific, suggest the visitor call or visit. Keep responses brief since this is a chat widget.`;
        systemPrompt = basePrompt + knowledgeBlock;
      }

      const gatewayMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.map(h => ({ role: h.role as 'user' | 'assistant' as const, content: h.content })),
        { role: 'user' as const, content: message },
      ];

      const { gatewayChat } = await import('./ai-gateway');
      const { response, provider, model } = await gatewayChat({
        messages: gatewayMessages,
        provider: resolvedProvider,
        model: resolvedModel,
        temperature: 0.7,
        max_tokens: 500,
      });

      if (siteConfigId && !isPlatformChat) {
        try {
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'user', content: message });
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'assistant', content: response });
        } catch (logErr) {
          console.error("[Website Chat] Failed to log chat:", logErr);
        }
      }

      res.json({ response, provider, model });
    } catch (error: any) {
      console.error("[Website Chat] Error:", error.message);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  // Simple in-memory rate limiting for public chat
  const chatRateLimits = new Map<string, { count: number; resetTime: number }>();
  const CHAT_RATE_LIMIT = 20; // requests per minute
  const CHAT_RATE_WINDOW = 60000; // 1 minute in ms

  app.post("/api/chat", async (req, res) => {
    try {
      // Rate limiting by IP
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const rateInfo = chatRateLimits.get(clientIp);
      
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
        } else if (rateInfo.count >= CHAT_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
      }

      // Validate request body with Zod
      const chatSchema = z.object({
        agentId: z.string().min(1),
        message: z.string().min(1).max(4000),
        projectId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history, projectId } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build system prompt based on agent personality
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      let systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with the following DISC personality profile: ${discProfile}. 
Be conversational, helpful, and maintain a consistent personality. Your voice style is ${agent.voiceName}.
Keep responses concise and engaging. If asked personal questions, you can share that you're an AI assistant named ${agent.name}.`;

      // Inject project context if a projectId is provided
      if (projectId) {
        try {
          const project = await storage.getProject(projectId);
          if (project) {
            const org = await storage.getOrganization(project.orgId);
            const projectTasksList = await storage.getProjectTasks(project.id);
            const todoTasks = projectTasksList.filter(t => t.status === 'todo');
            const inProgressTasks = projectTasksList.filter(t => t.status === 'in_progress');
            const reviewTasks = projectTasksList.filter(t => t.status === 'review');
            const doneTasks = projectTasksList.filter(t => t.status === 'done');

            let contextBlock = `\n\n--- PROJECT CONTEXT ---`;
            if (org) contextBlock += `\nOrganization: ${org.name}${org.description ? ' - ' + org.description : ''}`;
            contextBlock += `\nProject: ${project.name} (${project.status})`;
            if (project.description) contextBlock += `\nDescription: ${project.description}`;
            contextBlock += `\nTask Summary: ${todoTasks.length} to-do, ${inProgressTasks.length} in progress, ${reviewTasks.length} in review, ${doneTasks.length} done`;
            
            if (todoTasks.length > 0 || inProgressTasks.length > 0 || reviewTasks.length > 0) {
              contextBlock += `\n\nActive Tasks:`;
              [...inProgressTasks, ...reviewTasks, ...todoTasks].slice(0, 10).forEach(t => {
                contextBlock += `\n- [${t.status.toUpperCase()}] ${t.title}${t.priority !== 'medium' ? ' (' + t.priority + ')' : ''}${t.description ? ': ' + t.description.slice(0, 100) : ''}`;
              });
            }
            contextBlock += `\n--- END PROJECT CONTEXT ---`;
            contextBlock += `\n\nYou are working on the "${project.name}" project. Reference the project tasks and context in your responses. Help the user manage, plan, and execute this project.`;
            
            systemPrompt += contextBlock;
          }
        } catch (err) {
          console.warn('Failed to load project context for chat:', err);
        }
      }

      // Build conversation messages
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        })),
        { role: 'user' as const, content: message },
      ];

      // Use agent's configured model, falling back to K2_TURBO
      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;
      // Sovereign: Gemini is the sole AI provider. Model from Doppler.
      const modelToUse = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';

      // Retry once on transient failures
      let response: string;
      try {
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      } catch (firstError: any) {
        console.warn('Chat first attempt failed, retrying:', firstError.message);
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // ============================================
  // CALL LOGS API (alias for Gateway Admin)
  // ============================================

  // Get call logs (for Gateway Admin Usage & Logs tab)
  app.get("/api/call-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // CUSTOMER/LEAD MANAGEMENT API
  // ============================================

  // Get all customers (with optional search)
  app.get("/api/customers", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const customerList = await storage.getCustomers(search);
      res.json(customerList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ← extracted to server/routes/telephonyRoutes.ts

  // ========== A2P 10-DLC Compliance API ==========
  
  // Get all A2P brands
  app.get("/api/a2p/brands", async (req, res) => {
    try {
      const brands = await storage.getA2pBrands();
      res.json({ brands });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P brand
  app.get("/api/a2p/brands/:id", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(brand);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P brand registration
  app.post("/api/a2p/brands", async (req, res) => {
    try {
      const { 
        companyName, firstName, lastName, email, phone,
        country, taxId, website, vertical,
        stockExchange, stockSymbol, customerId
      } = req.body;

      if (!companyName || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ 
          error: "Missing required fields: companyName, firstName, lastName, email, phone" 
        });
      }

      // Create brand in our database first
      const brand = await storage.createA2pBrand({
        companyName,
        firstName,
        lastName,
        email,
        phone,
        country: country || 'US',
        taxId,
        website,
        vertical,
        stockExchange,
        stockSymbol,
        customerId,
        brandStatus: 'draft',
      });

      res.json({ 
        success: true, 
        brand,
        message: "Brand registration created. Submit for review after payment."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P brand
  app.patch("/api/a2p/brands/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pBrand(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P brand to Twilio for registration
  app.post("/api/a2p/brands/:id/submit", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create the brand in Twilio's Trust Hub
      // Note: This requires Twilio Trust Hub API setup
      try {
        const customerProfile = await client.trusthub.v1.customerProfiles.create({
          friendlyName: brand.companyName,
          email: brand.email,
          policySid: 'RN806dd6cd175f314e1f96a9727ee271f4', // A2P Messaging Policy SID
        });

        // Update brand with Twilio SID
        const updated = await storage.updateA2pBrand(brand.id, {
          brandSid: customerProfile.sid,
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: updated,
          customerProfileSid: customerProfile.sid,
          message: "Brand submitted to Twilio Trust Hub for review"
        });
      } catch (twilioError: any) {
        // If Trust Hub not set up, provide helpful error
        console.error('Twilio Trust Hub error:', twilioError);
        
        // Still update status to show attempt was made
        await storage.updateA2pBrand(brand.id, {
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: await storage.getA2pBrand(brand.id),
          warning: "Brand marked as pending. Full Twilio Trust Hub integration requires additional setup.",
          twilioError: twilioError.message
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all A2P campaigns
  app.get("/api/a2p/campaigns", async (req, res) => {
    try {
      const brandId = req.query.brandId as string;
      const campaigns = await storage.getA2pCampaigns(brandId);
      res.json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P campaign
  app.get("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P campaign
  app.post("/api/a2p/campaigns", async (req, res) => {
    try {
      const { 
        brandId, useCase, description, messageFlow,
        sampleMessages, optInDescription, optOutDescription,
        helpDescription, hasDirectLending,
        privacyPolicyUrl, termsOfServiceUrl
      } = req.body;

      if (!brandId || !useCase || !description) {
        return res.status(400).json({ 
          error: "Missing required fields: brandId, useCase, description" 
        });
      }

      // Verify brand exists
      const brand = await storage.getA2pBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const campaign = await storage.createA2pCampaign({
        brandId,
        useCase,
        description,
        messageFlow,
        sampleMessages: sampleMessages || [],
        optInDescription,
        optOutDescription,
        helpDescription,
        hasDirectLending: hasDirectLending || false,
        privacyPolicyUrl,
        termsOfServiceUrl,
        campaignStatus: 'draft',
      });

      res.json({ 
        success: true, 
        campaign,
        message: "Campaign created. Submit for review after brand is approved."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P campaign
  app.patch("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pCampaign(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P campaign for registration
  app.post("/api/a2p/campaigns/:id/submit", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const brand = await storage.getA2pBrand(campaign.brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.brandStatus !== 'approved' && brand.brandStatus !== 'pending') {
        return res.status(400).json({ 
          error: "Brand must be approved or pending before submitting campaign" 
        });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create messaging service if not exists
      let messagingServiceSid = campaign.messagingServiceSid;
      if (!messagingServiceSid) {
        try {
          const messagingService = await client.messaging.v1.services.create({
            friendlyName: `${brand.companyName} - ${campaign.useCase}`,
            useInboundWebhookOnNumber: false,
          });
          messagingServiceSid = messagingService.sid;
        } catch (msError: any) {
          console.error('Error creating messaging service:', msError);
        }
      }

      // Update campaign status
      const updated = await storage.updateA2pCampaign(campaign.id, {
        campaignStatus: 'pending',
        messagingServiceSid,
      });

      res.json({
        success: true,
        campaign: updated,
        messagingServiceSid,
        message: "Campaign submitted for review. This typically takes 1-7 business days."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook for A2P payment completion
  app.post("/api/stripe/webhook/a2p", async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const webhookSecret = process.env.STRIPE_A2P_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('STRIPE_A2P_WEBHOOK_SECRET not configured, skipping signature verification');
        const body = req.body;
        if (body?.type === 'checkout.session.completed') {
          await handleA2PCheckoutComplete(body.data.object);
        }
        return res.json({ received: true });
      }

      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).json({ error: 'Raw body not available' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      if (event.type === 'checkout.session.completed') {
        await handleA2PCheckoutComplete(event.data.object);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('A2P Stripe webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  async function handleA2PCheckoutComplete(session: any) {
    const { brandId, type, vettingType } = session.metadata || {};
    
    if (type !== 'a2p_brand_registration' || !brandId) {
      console.log('Ignoring non-A2P checkout session');
      return;
    }

    const brand = await storage.getA2pBrand(brandId);
    if (!brand) {
      console.error('Brand not found for payment:', brandId);
      return;
    }

    if (brand.stripePaymentId) {
      console.log('Brand already has payment recorded:', brandId);
      return;
    }

    const { getPricingConfig, toCents } = await import('./utils/pricing');
    const _pricing = getPricingConfig();
    const _brandReg   = toCents(_pricing.flat_fee.monthly.amount);
    const _expedited  = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS ?? 8500));
    const _standard   = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS  ?? 4000));
    const totalAmount = session.amount_total || (vettingType === 'expedited' ? _brandReg + _expedited : _brandReg + _standard);

    await storage.updateA2pBrand(brandId, {
      stripePaymentId: session.payment_intent as string,
      amountPaid: totalAmount,
      vettingStatus: 'pending',
      vettingProvider: 'campaign-verify',
      brandStatus: 'pending',
    });

    console.log(`A2P brand ${brandId} payment complete: $${(totalAmount / 100).toFixed(2)}`);
  }

  // A2P Compliance payment - Create checkout session for brand registration
  app.post("/api/a2p/brands/:id/pay", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.stripePaymentId) {
        return res.status(400).json({ error: "Payment already processed for this brand" });
      }

      const { getUncachableStripeClient, getStripePublishableKey } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const { getPricingConfig, toCents } = await import('./utils/pricing');
      const pricing = getPricingConfig();

      // All amounts sourced from pricing_v1.yaml or Doppler env vars.
      // Math.round() via toCents() prevents floating-point drift.
      const brandRegCents   = toCents(pricing.flat_fee.monthly.amount);
      const expeditedCents  = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS  ?? 8500));
      const standardCents   = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS   ?? 4000));

      const { vettingType = 'standard' } = req.body;

      const lineItems: any[] = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A2P Brand Registration',
              description: `Brand registration for ${brand.companyName}`,
            },
            unit_amount: brandRegCents,
          },
          quantity: 1,
        }
      ];

      if (vettingType === 'expedited') {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Expedited Vetting',
              description: 'Priority vetting (24-48 hours)',
            },
            unit_amount: expeditedCents,
          },
          quantity: 1,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Standard Vetting',
              description: 'Standard vetting (3-5 business days)',
            },
            unit_amount: standardCents,
          },
          quantity: 1,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=success&brand_id=${brand.id}`,
        cancel_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=cancelled`,
        metadata: {
          brandId: brand.id,
          type: 'a2p_brand_registration',
          vettingType,
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
        publishableKey: await getStripePublishableKey(),
      });
    } catch (error: any) {
      console.error('A2P payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle A2P payment success callback
  app.post("/api/a2p/brands/:id/payment-complete", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const { sessionId, vettingType = 'standard' } = req.body;

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      if (session.metadata?.brandId !== brand.id) {
        return res.status(400).json({ error: "Payment session mismatch" });
      }

      const { getPricingConfig, toCents } = await import('./utils/pricing');
      const _p2 = getPricingConfig();
      const _b2 = toCents(_p2.flat_fee.monthly.amount);
      const _e2 = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS ?? 8500));
      const _s2 = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS  ?? 4000));
      const totalAmount = vettingType === 'expedited' ? _b2 + _e2 : _b2 + _s2;

      const updated = await storage.updateA2pBrand(brand.id, {
        stripePaymentId: session.payment_intent as string,
        amountPaid: totalAmount,
        vettingStatus: 'pending',
        vettingProvider: 'campaign-verify',
        brandStatus: 'pending',
      });

      res.json({
        success: true,
        brand: updated,
        message: "Payment received. Brand submitted for review."
      });
    } catch (error: any) {
      console.error('A2P payment complete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // A2P Compliance pricing info
  app.get("/api/a2p/pricing", async (req, res) => {
    res.json({
      brandRegistration: {
        fee: 4900, // $49.00 in cents
        description: "One-time brand registration fee"
      },
      standardVetting: {
        fee: 4000, // $40.00 in cents
        description: "Standard vetting (3-5 business days)"
      },
      expeditedVetting: {
        fee: 8500, // $85.00 in cents
        description: "Expedited vetting (24-48 hours)"
      },
      campaignRegistration: {
        fee: 1500, // $15.00 in cents
        description: "Per-campaign registration fee"
      },
      monthlyMaintenance: {
        fee: 2900, // $29.00 in cents
        description: "Monthly compliance maintenance"
      },
      setupService: {
        basic: 9900, // $99.00 in cents
        standard: 19900, // $199.00 in cents
        premium: 29900, // $299.00 in cents
        description: "Full-service setup assistance"
      }
    });
  });

  // Get conversation history API
  app.get("/api/conversations/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const conversation = await storage.getConversationByPhone(phoneNumber);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesByConversation(conversation.id, 100);
      
      res.json({
        conversation,
        messages: messages.reverse(), // Oldest first
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MCP (Model Context Protocol) — DECOMMISSIONED ==========
  // Kimi K2 MCP server removed. These routes return 410 Gone.
  // Future: Gemini-native tool calling replaces this pattern.

  app.get("/api/mcp/tools", (_req, res) => {
    res.status(410).json({ error: "Kimi K2 MCP server decommissioned. Use Gemini tool declarations." });
  });

  app.post("/api/mcp/tools/:toolName", (_req, res) => {
    res.status(410).json({ error: "Kimi K2 MCP server decommissioned. Use Gemini tool declarations." });
  });

  // Quick coding task - auto-selects best tool
  app.post("/api/mcp/code", async (req, res) => {
    try {
      const { task, code, language, error: errorMsg, _hfToken, _temperature, _maxTokens, _modelId } = req.body;
      
      const options: ModelOptions = {
        hfToken: _hfToken,
        temperature: _temperature,
        maxTokens: _maxTokens,
        modelId: _modelId,
      };
      
      let toolName: string;
      let args: Record<string, any>;
      
      if (errorMsg) {
        toolName = "diagnose_error";
        args = { error: errorMsg, context: code, language };
      } else if (code && task?.toLowerCase().includes("fix")) {
        toolName = "fix_code";
        args = { code, language, issue: task };
      } else if (code && task?.toLowerCase().includes("explain")) {
        toolName = "explain_code";
        args = { code, language };
      } else if (code) {
        toolName = "analyze_code";
        args = { code, language, focus: task };
      } else {
        toolName = "generate_code";
        args = { task, language: language || "typescript" };
      }
      
      console.log(`[MCP] Auto-selected tool: ${toolName}`);
      
      // Kimi K2 MCP decommissioned — return 410
      res.status(410).json({ error: "Kimi K2 MCP code tasks decommissioned.", tool: toolName });
      return;
    } catch (error: any) {
      console.error(`[MCP] Code task error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom / Micro-Learning API Routes
  const { getOrCreateLessonForTopic, generateSlideContent, recordLessonCompletion, improveLessonPlan, getPopularTopics, getLessonById } = await import("./classroom");

  app.post("/api/classroom/lesson", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: "Topic is required" });
      }
      const result = await getOrCreateLessonForTopic(topic);
      res.json(result);
    } catch (error: any) {
      console.error("[Classroom] Lesson generation error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classroom/lesson/:id", async (req, res) => {
    try {
      const lesson = await getLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/slide-content", async (req, res) => {
    try {
      const { topic, slideTitle, slideDescription } = req.body;
      if (!topic || !slideTitle || !slideDescription) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const content = await generateSlideContent(topic, slideTitle, slideDescription);
      res.json(content);
    } catch (error: any) {
      console.error("[Classroom] Slide content error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/complete", async (req, res) => {
    try {
      const { lessonPlanId, quizScore, slidesViewed, totalSlides, feedback, rating, userPhone } = req.body;
      if (!lessonPlanId) {
        return res.status(400).json({ error: "Lesson plan ID required" });
      }
      const result = await recordLessonCompletion(lessonPlanId, quizScore, slidesViewed, totalSlides, feedback, rating, userPhone);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[Classroom] Completion recording error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/improve/:topicId", async (req, res) => {
    try {
      const improved = await improveLessonPlan(req.params.topicId);
      res.json(improved);
    } catch (error: any) {
      console.error("[Classroom] Lesson improvement error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classroom/popular-topics", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topics = await getPopularTopics(limit);
      res.json(topics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom image generation using Replicate (Flux model)
  app.post("/api/classroom/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "16:9" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      
      // Use Flux for high-quality educational images
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: `Educational illustration: ${prompt}. High quality, clear, professional, suitable for teaching.`,
            aspect_ratio: aspectRatio,
            output_format: "webp",
            output_quality: 90
          }
        }
      );
      
      // Flux returns an array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("[Classroom] Image generation error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom TTS using Kimi-Audio via Replicate
  app.post("/api/classroom/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Kimi-Audio (Replicate) decommissioned — classroom TTS returns 410
      res.status(410).json({ error: "Classroom TTS via Kimi-Audio is decommissioned. Use /api/tts/synthesize for Gemini Native Audio." });
      return;
      const output: any = null;
      // Parse former response
      let audioUrl = "";
      if (Array.isArray(output)) {
        for (const item of output) {
          if (typeof item === "string" && item.startsWith("http")) {
            audioUrl = item;
            break;
          }
        }
      }
      
      res.json({ audioUrl });
    } catch (error: any) {
      console.error("[Classroom] TTS error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SUBSCRIPTION CHECKOUT ====================

  // Create a Stripe Checkout Session for a plan upgrade (per-business)
  app.post("/api/subscriptions/create-checkout-session", async (req, res) => {
    try {
      const { getStripeClient, getStripePublishableKey, STRIPE_PRICE_IDS } = await import('./stripeClient');
      const stripe = getStripeClient();

      // Support Bearer token auth (primary) or legacy session (fallback)
      const bearerToken = (req.headers.authorization || '').replace('Bearer ', '').trim();
      let customerSession: { id: string; email?: string } | null = null;
      if (bearerToken) {
        const dbSession = await storage.getValidCustomerSession(bearerToken);
        if (dbSession) {
          const account = await storage.getCustomerAccountById(dbSession.customerAccountId);
          if (account?.isActive) customerSession = { id: account.id, email: account.email ?? undefined };
        }
      }
      if (!customerSession) customerSession = (req as any).session?.customerAccount ?? null;
      if (!customerSession?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { plan, siteConfigId } = req.body as { plan: string; siteConfigId: string };
      if (!plan || !siteConfigId) {
        return res.status(400).json({ error: 'plan and siteConfigId are required' });
      }

      const priceId = STRIPE_PRICE_IDS[plan];
      if (!priceId) {
        return res.status(400).json({ error: `Unknown plan: ${plan}` });
      }

      const host = req.headers.host || 'localhost:3004';
      const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
      const baseUrl = `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/my-account/site/${siteConfigId}?upgrade=success&plan=${plan}`,
        cancel_url: `${baseUrl}/my-account?upgrade=cancelled`,
        metadata: { siteConfigId, plan, customerId: customerSession.id },
        client_reference_id: siteConfigId,
      });

      res.json({ url: session.url, publishableKey: getStripePublishableKey() });
    } catch (error: any) {
      console.error('[Stripe] create-checkout-session error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook — subscription plan upgrades
  app.post("/api/stripe/webhook/subscriptions", async (req, res) => {
    try {
      const { getStripeClient, getStripeWebhookSecret } = await import('./stripeClient');
      const stripe = getStripeClient();
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = getStripeWebhookSecret();

      let event: any;
      const rawBody = (req as any).rawBody ?? req.body;

      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.error('[Stripe] Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
        }
      } else {
        console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev mode)');
        event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const meta = session.metadata ?? {};
        const { siteConfigId, plan } = meta;
        const siteId = meta.siteId ?? siteConfigId;

        // ── Site Claim Activation ─────────────────────────────────────────────
        if (meta.claimToken && meta.siteId) {
          await handleClaimCheckoutCompleted(session);
          // Claim activation is fully handled in claimRoutes — skip other branches
        } else if (meta.type === 'ENERGY_REFILL' && siteId) {
          const site = await storage.getSiteConfigById(siteId);
          if (site) {
            const minutes = meta.packageType === 'pro' ? 1200 : 500;
            const current = site.minuteBalance ?? 0;
            await storage.updateSiteConfig(siteId, { minuteBalance: current + minutes, lastNudgeSentAt: null } as any);
            try {
              const { processCommission } = await import('./services/commission');
              await processCommission(session, siteId);
            } catch (e: any) {
              console.error('[Stripe] ENERGY_REFILL processCommission failed (non-fatal):', e?.message);
            }
            try {
              const { broadcastLiveEvent } = await import('./services/eventBridge');
              broadcastLiveEvent(siteId, { type: 'ENERGY_REFILL_SUCCESS', data: { minutes } });
            } catch (e: any) {
              console.error('[Stripe] ENERGY_REFILL broadcast failed (non-fatal):', e?.message);
            }
            console.log(`[Stripe] Energy refill → site ${siteId} +${minutes} min`);
          }
        } else if (siteConfigId && plan) {
          await storage.updateSiteConfig(siteConfigId, { plan } as any);
          console.log(`[Stripe] Plan upgraded → site ${siteConfigId} is now on "${plan}"`);

          // Post-payment onboarding email (non-fatal — never blocks the webhook response)
          try {
            const { sendPlatformEmail } = await import('./services/emailService');
            const siteConfig = await storage.getSiteConfig(siteConfigId);
            const platformId = await storage.getOrCreatePlatformId(siteConfigId);

            let ownerEmail: string | null = null;
            let ownerName = 'Valued Customer';
            if (siteConfig?.ownerId) {
              const owner = await storage.getCustomerAccountById(siteConfig.ownerId);
              ownerEmail = owner?.email ?? null;
              ownerName = owner?.name || ownerName;
            }
            // Fallback: use customer_email from Stripe session if owner email not in DB
            const recipientEmail = ownerEmail || (session as any).customer_email || null;

            if (recipientEmail && siteConfig) {
              await sendPlatformEmail({
                to: recipientEmail,
                customerName: ownerName,
                businessName: siteConfig.name || 'Your Business',
                planName: plan,
                platformId,
                siteUrl: (siteConfig as any).domain ? `https://${(siteConfig as any).domain}` : '',
              });
              console.log(`[Stripe] Onboarding email sent → ${recipientEmail} (platform: ${platformId})`);
            } else {
              console.warn(`[Stripe] Onboarding email skipped — no recipient email for site ${siteConfigId}`);
            }
          } catch (emailErr: any) {
            console.error('[Stripe] Onboarding email failed (non-fatal):', emailErr.message);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Stripe] Subscription webhook error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BILLING / PAYMENT METHODS ====================

  app.get("/api/billing/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/billing/history", async (req, res) => {
    try {
      const bearerToken = (req.headers.authorization || "").replace("Bearer ", "").trim();
      let customerAccount: { id: string; stripeCustomerId: string | null } | null = null;
      if (bearerToken) {
        const dbSession = await storage.getValidCustomerSession(bearerToken);
        if (dbSession) {
          const account = await storage.getCustomerAccountById(dbSession.customerAccountId);
          if (account?.isActive) customerAccount = { id: account.id, stripeCustomerId: account.stripeCustomerId ?? null };
        }
      }
      if (!customerAccount) return res.status(401).json({ error: "Authentication required" });
      if (!customerAccount.stripeCustomerId) return res.json({ invoices: [] });
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      const list = await stripe.invoices.list({
        customer: customerAccount.stripeCustomerId,
        limit: 12,
        status: "paid",
      });
      const invoices = (list.data ?? []).map((inv: any) => ({
        id: inv.id,
        created: inv.created,
        amount_paid: inv.amount_paid,
        invoice_pdf: inv.invoice_pdf,
        description: inv.lines?.data?.[0]?.description ?? inv.description ?? "Invoice",
        category: inv.metadata?.category ?? "platform",
      }));
      res.json({ invoices });
    } catch (error: any) {
      console.error("[Billing] history error:", error?.message);
      res.status(500).json({ error: error?.message ?? "Failed to load history" });
    }
  });

  app.post("/api/billing/create-refill-session", async (req, res) => {
    try {
      const schema = z.object({ siteId: z.string().min(1), packageType: z.enum(["basic", "pro"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "siteId and packageType (basic|pro) required" });
      const { siteId, packageType } = parsed.data;
      const site = await storage.getSiteConfigById(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const { getStripeClient, STRIPE_ENERGY_PRICE_IDS } = await import("./stripeClient");
      const priceId = STRIPE_ENERGY_PRICE_IDS[packageType];
      if (!priceId) return res.status(400).json({ error: "Energy refill price not configured for this package" });
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { siteId, type: "ENERGY_REFILL", packageType, category: "usage" },
        success_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/billing?refill=success`,
        cancel_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/billing?refill=cancelled`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Billing] create-refill-session error:", error?.message);
      res.status(500).json({ error: error?.message ?? "Failed to create checkout session" });
    }
  });

  app.post("/api/billing/setup-intent", async (req, res) => {
    try {
      const { customerId } = req.body;
      if (!customerId) return res.status(400).json({ error: "customerId is required" });

      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          name: customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          metadata: { gatewayCustomerId: customer.id },
        });
        stripeCustomerId = stripeCustomer.id;
        await storage.updateCustomer(customer.id, { stripeCustomerId: stripeCustomer.id });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      });

      res.json({ clientSecret: setupIntent.client_secret, stripeCustomerId });
    } catch (error: any) {
      console.error("[Billing] Setup intent error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/billing/payment-methods/:customerId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      if (!customer.stripeCustomerId) return res.json({ paymentMethods: [], defaultPaymentMethodId: null });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const methods = await stripe.paymentMethods.list({
        customer: customer.stripeCustomerId,
        type: 'card',
      });

      const stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);
      const defaultPmId = (stripeCustomer as any).invoice_settings?.default_payment_method || null;

      res.json({
        paymentMethods: methods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: pm.id === defaultPmId,
        })),
        defaultPaymentMethodId: defaultPmId,
      });
    } catch (error: any) {
      console.error("[Billing] List methods error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/billing/payment-methods/:customerId/default", async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId is required" });

      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.customers.update(customer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Set default error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/billing/payment-methods/:customerId/:paymentMethodId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.paymentMethods.detach(req.params.paymentMethodId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Remove method error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ← extracted to server/routes/telephonyRoutes.ts


  // VoiceLead Machine routes
  registerVlmRoutes(app);

  // Register Agent System routes
  registerAgentRoutes(app);

  // Register Workspace Onboarding routes
  registerWorkspaceOnboardingRoutes(app);

  // Register Knowledge Base routes
  app.use("/api/knowledge", knowledgeRoutes);
  app.use("/api/business", businessRoutes);
  app.use("/api/site-configs", siteConfigRoutes);
  app.use("/api/onboarding", onboardingRoutes);

  // Register Site Claim / Assignment routes (assign + preview + OTP + Stripe checkout)
  app.use(claimRoutes);

  // Intelligence Ingestion: POST /api/ingest-plan
  app.use(ingestPlanRoutes);

  // Bail Rescue public API: GET /api/bail-rescue/:token, POST /api/bail-rescue/:token/checkout
  app.use(bailRescueRoutes);

  // Agent Deep Research: POST /api/generate-agent-persona
  app.use(agentResearchRoutes);

  // NOVA Sovereign Billing: POST /api/nova/billing/push, POST /api/nova/billing/receive
  app.use("/api/nova", novaSovereignRouter);

  // Register Menu and Cart routes
  registerMenuRoutes(app);

  // Register Inquiry routes
  registerInquiryRoutes(app);

  // B2B Travel OS: itineraries, GRN/SerpAPI leads, markups, curation events
  registerB2bRoutes(app);

  // SPA catch-all is registered in server/index.ts AFTER serveStatic() so that
  // express.static handles /assets/* before the wildcard can intercept them.

  return httpServer;
}
